import OrderModel from "@/src/models/order.model";
import ProjectModel from "@/src/models/projects.model";
import UserModel from "@/src/models/user.model";
import ProposalModel from "@/src/models/proposal.model";
import { DashboardData } from "../../../type";

export const getDashboardData = async (timeRange: string): Promise<DashboardData> => {
  const now = new Date();
  let startDate: Date | undefined;

  switch (timeRange) {
    case "7":
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case "30":
      startDate = new Date(now.setDate(now.getDate() - 30));
      break;
    case "90":
      startDate = new Date(now.setDate(now.getDate() - 90));
      break;
    case "all":
      startDate = undefined;
      break;
    default:
      startDate = new Date(now.setDate(now.getDate() - 30));
  }

  const query = startDate ? { createdAt: { $gte: startDate } } : {};

  // Order metrics
  const totalOrders = await OrderModel.countDocuments(query);
  const ordersByStatus = {
    pending: await OrderModel.countDocuments({ ...query, status: "pending" }),
    inProgress: await OrderModel.countDocuments({ ...query, status: "in-progress" }),
    accepted: await OrderModel.countDocuments({ ...query, status: "accepted" }),
    rejected: await OrderModel.countDocuments({ ...query, status: "rejected" }),
    delivered: await OrderModel.countDocuments({ ...query, status: "delivered" }),
    completed: await OrderModel.countDocuments({ ...query, status: "completed" }),
    cancelled: await OrderModel.countDocuments({ ...query, status: "cancelled" }),
  };

  // Revision status counts
  const revisionStatusCounts = {
    none: await OrderModel.countDocuments({ ...query, revisionStatus: "none" }),
    requested: await OrderModel.countDocuments({ ...query, revisionStatus: "requested" }),
    submitted: await OrderModel.countDocuments({ ...query, revisionStatus: "submitted" }),
  };

  // Project metrics
  const totalProjects = await ProjectModel.countDocuments(query);
  const projectsByStatus = {
    open: await ProjectModel.countDocuments({ ...query, status: "open" }),
    inProgress: await ProjectModel.countDocuments({ ...query, status: "in-progress" }),
    completed: await ProjectModel.countDocuments({ ...query, status: "completed" }),
    cancelled: await ProjectModel.countDocuments({ ...query, status: "cancelled" }),
  };

  // Projects by category
  const categoryAggregation = await ProjectModel.aggregate([
    { $match: query },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  const projectsByCategory = categoryAggregation.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {} as { [key: string]: number });

  // Total revenue from completed orders and delivered proposals
  const revenueFromOrdersAggregation = await OrderModel.aggregate([
    { $match: { ...query, status: "completed" } },
    { $group: { _id: null, total: { $sum: "$ratePlan.price" } } },
  ]);
  const revenueFromOrders = revenueFromOrdersAggregation[0]?.total || 0;

  const revenueFromProposalsAggregation = await ProposalModel.aggregate([
    { $match: { ...query, proposalStatus: "delivered" } },
    { $group: { _id: null, total: { $sum: "$bid" } } },
  ]);
  const revenueFromProposals = revenueFromProposalsAggregation[0]?.total || 0;
  const totalRevenue = revenueFromOrders + revenueFromProposals;

  // Transaction metrics (including orders and proposals)
  const totalTransactions = await OrderModel.countDocuments(query) + await ProposalModel.countDocuments({ ...query, proposalStatus: { $in: ["accepted", "delivered", "revision-requested"] } });
  const transactionsByStatus = {
    pending: await OrderModel.countDocuments({ ...query, paymentStatus: "pending" }) + await ProposalModel.countDocuments({ ...query, proposalStatus: "pending" }),
    completed: await OrderModel.countDocuments({ ...query, paymentStatus: "completed" }) + await ProposalModel.countDocuments({ ...query, proposalStatus: "delivered" }),
    failed: await OrderModel.countDocuments({ ...query, paymentStatus: "failed" }),
    cancelled: await OrderModel.countDocuments({ ...query, paymentStatus: "cancelled" }),
  };

  // Recent orders
  const recentOrders = await OrderModel.find(query)
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();
  const recentOrdersWithUserNames = await Promise.all(
    recentOrders.map(async (order: any) => {
      const client = await UserModel.findById(order.clientId).select("userName").lean();
      const talent = await UserModel.findById(order.talentId).select("userName").lean();
      return {
        _id: order._id.toString(),
        talentId: order.talentId,
        clientId: order.clientId,
        clientUserName: client?.userName || "Unknown",
        talentUserName: talent?.userName || "Unknown",
        ratePlan: {
          type: order.ratePlan.type,
          price: order.ratePlan.price,
          description: order.ratePlan.description,
          whatsIncluded: order.ratePlan.whatsIncluded,
          deliveryDays: order.ratePlan.deliveryDays,
          revisions: order.ratePlan.revisions,
        },
        projectDetails: {
          title: order.projectDetails.title,
          description: order.projectDetails.description,
        },
        status: order.status,
        revisionStatus: order.revisionStatus || "none",
        revisionCount: order.revisionCount || 0,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        revisionRequest: order.revisionRequest
          ? {
              files: order.revisionRequest.files || [],
              note: order.revisionRequest.note || undefined,
              requestedAt: order.revisionRequest.requestedAt?.toISOString() || "",
            }
          : undefined,
      };
    })
  );

  // Recent transactions (from both orders and proposals)
  const recentOrderTransactions = await OrderModel.find(query)
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();

  const recentProposalTransactions = await ProposalModel.find({ 
    ...query, 
    proposalStatus: { $in: ["accepted", "delivered", "revision-requested"] } 
  })
    .sort({ createdAt: -1 })
    .limit(2)
    .lean();

  // Process order transactions
  const orderTransactionsWithUsers = await Promise.all(
    recentOrderTransactions.map(async (order: any) => {
      const client = await UserModel.findById(order.clientId).select("userName").lean();
      const talent = await UserModel.findById(order.talentId).select("userName").lean();
      return {
        _id: order._id,
        orderId: order._id,
        clientId: order.clientId,
        clientUserName: client?.userName || "Unknown",
        talentId: order.talentId,
        talentUserName: talent?.userName || "Unknown",
        amount: order.ratePlan.price || 0,
        paymentStatus: order.paymentStatus || "pending",
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        relatedTo: "order" as const,
      };
    })
  );

  // Process proposal transactions
  const proposalTransactionsWithUsers = await Promise.all(
    recentProposalTransactions.map(async (proposal: any) => {
      const client = await UserModel.findById(proposal.clientId).select("userName").lean();
      const talent = await UserModel.findById(proposal.talentId).select("userName").lean();
      let paymentStatus: "pending" | "completed" | "failed" | "cancelled" = "pending";
      if (proposal.proposalStatus === "delivered") paymentStatus = "completed";
      return {
        _id: proposal._id,
        orderId: proposal.projectId,
        clientId: proposal.clientId || "unknown",
        clientUserName: client?.userName || "Unknown",
        talentId: proposal.talentId,
        talentUserName: talent?.userName || "Unknown",
        amount: proposal.bid || 0,
        paymentStatus,
        createdAt: proposal.createdAt.toISOString(),
        updatedAt: proposal.updatedAt.toISOString(),
        relatedTo: "project" as const,
      };
    })
  );

  // Combine and sort all transactions
  const recentTransactionsWithUserNames = [
    ...orderTransactionsWithUsers,
    ...proposalTransactionsWithUsers
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Recent projects
  const recentProjects = await ProjectModel.find(query)
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();
  const recentProjectsWithUserNames = await Promise.all(
    recentProjects.map(async (project: any) => {
      const client = await UserModel.findById(project.clientId).select("userName").lean();
      return {
        _id: project._id.toString(),
        clientId: project.clientId,
        clientUserName: client?.userName || "Unknown",
        title: project.title,
        category: project.category,
        status: project.status,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      };
    })
  );

  const dashboardData: DashboardData = {
    totalOrders,
    ordersByStatus,
    revisionStatusCounts,
    totalProjects,
    projectsByStatus,
    projectsByCategory,
    totalRevenue,
    totalTransactions,
    transactionsByStatus,
    recentTransactions: recentTransactionsWithUserNames,
    recentOrders: recentOrdersWithUserNames,
    recentProjects: recentProjectsWithUserNames,
  };

  console.log("getDashboardData result:", JSON.stringify(dashboardData, null, 2));
  return dashboardData;
};