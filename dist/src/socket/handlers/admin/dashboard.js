"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardData = void 0;
const order_model_1 = __importDefault(require("@/src/models/order.model"));
const projects_model_1 = __importDefault(require("@/src/models/projects.model"));
const user_model_1 = __importDefault(require("@/src/models/user.model"));
const proposal_model_1 = __importDefault(require("@/src/models/proposal.model"));
const getDashboardData = async (timeRange) => {
    var _a, _b;
    const now = new Date();
    let startDate;
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
    const totalOrders = await order_model_1.default.countDocuments(query);
    const ordersByStatus = {
        pending: await order_model_1.default.countDocuments(Object.assign(Object.assign({}, query), { status: "pending" })),
        inProgress: await order_model_1.default.countDocuments(Object.assign(Object.assign({}, query), { status: "in-progress" })),
        accepted: await order_model_1.default.countDocuments(Object.assign(Object.assign({}, query), { status: "accepted" })),
        rejected: await order_model_1.default.countDocuments(Object.assign(Object.assign({}, query), { status: "rejected" })),
        delivered: await order_model_1.default.countDocuments(Object.assign(Object.assign({}, query), { status: "delivered" })),
        completed: await order_model_1.default.countDocuments(Object.assign(Object.assign({}, query), { status: "completed" })),
        cancelled: await order_model_1.default.countDocuments(Object.assign(Object.assign({}, query), { status: "cancelled" })),
    };
    // Revision status counts
    const revisionStatusCounts = {
        none: await order_model_1.default.countDocuments(Object.assign(Object.assign({}, query), { revisionStatus: "none" })),
        requested: await order_model_1.default.countDocuments(Object.assign(Object.assign({}, query), { revisionStatus: "requested" })),
        submitted: await order_model_1.default.countDocuments(Object.assign(Object.assign({}, query), { revisionStatus: "submitted" })),
    };
    // Project metrics
    const totalProjects = await projects_model_1.default.countDocuments(query);
    const projectsByStatus = {
        open: await projects_model_1.default.countDocuments(Object.assign(Object.assign({}, query), { status: "open" })),
        inProgress: await projects_model_1.default.countDocuments(Object.assign(Object.assign({}, query), { status: "in-progress" })),
        completed: await projects_model_1.default.countDocuments(Object.assign(Object.assign({}, query), { status: "completed" })),
        cancelled: await projects_model_1.default.countDocuments(Object.assign(Object.assign({}, query), { status: "cancelled" })),
    };
    // Projects by category
    const categoryAggregation = await projects_model_1.default.aggregate([
        { $match: query },
        { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);
    const projectsByCategory = categoryAggregation.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
    }, {});
    // Total revenue from completed orders and delivered proposals
    const revenueFromOrdersAggregation = await order_model_1.default.aggregate([
        { $match: Object.assign(Object.assign({}, query), { status: "completed" }) },
        { $group: { _id: null, total: { $sum: "$ratePlan.price" } } },
    ]);
    const revenueFromOrders = ((_a = revenueFromOrdersAggregation[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
    const revenueFromProposalsAggregation = await proposal_model_1.default.aggregate([
        { $match: Object.assign(Object.assign({}, query), { proposalStatus: "delivered" }) },
        { $group: { _id: null, total: { $sum: "$bid" } } },
    ]);
    const revenueFromProposals = ((_b = revenueFromProposalsAggregation[0]) === null || _b === void 0 ? void 0 : _b.total) || 0;
    const totalRevenue = revenueFromOrders + revenueFromProposals;
    // Transaction metrics (including orders and proposals)
    const totalTransactions = await order_model_1.default.countDocuments(query) + await proposal_model_1.default.countDocuments(Object.assign(Object.assign({}, query), { proposalStatus: { $in: ["accepted", "delivered", "revision-requested"] } }));
    const transactionsByStatus = {
        pending: await order_model_1.default.countDocuments(Object.assign(Object.assign({}, query), { paymentStatus: "pending" })) + await proposal_model_1.default.countDocuments(Object.assign(Object.assign({}, query), { proposalStatus: "pending" })),
        completed: await order_model_1.default.countDocuments(Object.assign(Object.assign({}, query), { paymentStatus: "completed" })) + await proposal_model_1.default.countDocuments(Object.assign(Object.assign({}, query), { proposalStatus: "delivered" })),
        failed: await order_model_1.default.countDocuments(Object.assign(Object.assign({}, query), { paymentStatus: "failed" })),
        cancelled: await order_model_1.default.countDocuments(Object.assign(Object.assign({}, query), { paymentStatus: "cancelled" })),
    };
    // Recent orders
    const recentOrders = await order_model_1.default.find(query)
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
    const recentOrdersWithUserNames = await Promise.all(recentOrders.map(async (order) => {
        var _a;
        const client = await user_model_1.default.findById(order.clientId).select("userName").lean();
        const talent = await user_model_1.default.findById(order.talentId).select("userName").lean();
        return {
            _id: order._id.toString(),
            talentId: order.talentId,
            clientId: order.clientId,
            clientUserName: (client === null || client === void 0 ? void 0 : client.userName) || "Unknown",
            talentUserName: (talent === null || talent === void 0 ? void 0 : talent.userName) || "Unknown",
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
                    requestedAt: ((_a = order.revisionRequest.requestedAt) === null || _a === void 0 ? void 0 : _a.toISOString()) || "",
                }
                : undefined,
        };
    }));
    // Recent transactions (from both orders and proposals)
    const recentOrderTransactions = await order_model_1.default.find(query)
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();
    const recentProposalTransactions = await proposal_model_1.default.find(Object.assign(Object.assign({}, query), { proposalStatus: { $in: ["accepted", "delivered", "revision-requested"] } }))
        .sort({ createdAt: -1 })
        .limit(2)
        .lean();
    // Process order transactions
    const orderTransactionsWithUsers = await Promise.all(recentOrderTransactions.map(async (order) => {
        const client = await user_model_1.default.findById(order.clientId).select("userName").lean();
        const talent = await user_model_1.default.findById(order.talentId).select("userName").lean();
        return {
            _id: order._id,
            orderId: order._id,
            clientId: order.clientId,
            clientUserName: (client === null || client === void 0 ? void 0 : client.userName) || "Unknown",
            talentId: order.talentId,
            talentUserName: (talent === null || talent === void 0 ? void 0 : talent.userName) || "Unknown",
            amount: order.ratePlan.price || 0,
            paymentStatus: order.paymentStatus || "pending",
            createdAt: order.createdAt.toISOString(),
            updatedAt: order.updatedAt.toISOString(),
            relatedTo: "order",
        };
    }));
    // Process proposal transactions
    const proposalTransactionsWithUsers = await Promise.all(recentProposalTransactions.map(async (proposal) => {
        const client = await user_model_1.default.findById(proposal.clientId).select("userName").lean();
        const talent = await user_model_1.default.findById(proposal.talentId).select("userName").lean();
        let paymentStatus = "pending";
        if (proposal.proposalStatus === "delivered")
            paymentStatus = "completed";
        return {
            _id: proposal._id,
            orderId: proposal.projectId,
            clientId: proposal.clientId || "unknown",
            clientUserName: (client === null || client === void 0 ? void 0 : client.userName) || "Unknown",
            talentId: proposal.talentId,
            talentUserName: (talent === null || talent === void 0 ? void 0 : talent.userName) || "Unknown",
            amount: proposal.bid || 0,
            paymentStatus,
            createdAt: proposal.createdAt.toISOString(),
            updatedAt: proposal.updatedAt.toISOString(),
            relatedTo: "project",
        };
    }));
    // Combine and sort all transactions
    const recentTransactionsWithUserNames = [
        ...orderTransactionsWithUsers,
        ...proposalTransactionsWithUsers
    ]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
    // Recent projects
    const recentProjects = await projects_model_1.default.find(query)
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
    const recentProjectsWithUserNames = await Promise.all(recentProjects.map(async (project) => {
        const client = await user_model_1.default.findById(project.clientId).select("userName").lean();
        return {
            _id: project._id.toString(),
            clientId: project.clientId,
            clientUserName: (client === null || client === void 0 ? void 0 : client.userName) || "Unknown",
            title: project.title,
            category: project.category,
            status: project.status,
            createdAt: project.createdAt.toISOString(),
            updatedAt: project.updatedAt.toISOString(),
        };
    }));
    const dashboardData = {
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
exports.getDashboardData = getDashboardData;
