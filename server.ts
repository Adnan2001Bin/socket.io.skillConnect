import dotenv from "dotenv";
import http from "http";
import { Server, Socket } from "socket.io";
import connectDB from "./src/lib/connectDB";
import { authMiddleware } from "./src/socket/middleware/auth";
import { getDashboardData } from "./src/socket/handlers/admin/dashboard";
import { setupMessagingHandlers } from "./src/socket/handlers/messaging";
import ProjectModel, { IProject } from "./src/models/projects.model";
import ProposalModel, { IProposal } from "./src/models/proposal.model";
import OrderModel, { IOrder } from "./src/models/order.model";
import MessageModel from "./src/models/message.model";
import NotificationModel from "./src/models/notification.model";
import { LeanMessage } from "./src/type";
import UserModel from "./src/models/user.model";
import express from "express"

dotenv.config();

const PORT = process.env.SOCKET_PORT || 4000;

// Create Express app for health checks
const app = express();
app.use(express.json());
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    service: "Socket.IO Server"
  });
});

const server = http.createServer(app);
const allowedOrigins = process.env.NEXT_PUBLIC_APP_URL
  ? process.env.NEXT_PUBLIC_APP_URL.split(",")
  : ["http://localhost:3000", "https://skillconnect-one.vercel.app" , "https://socket-io-skillconnect.onrender.com"];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.use(authMiddleware);

async function getTalentDashboardData(talentId: string) {
  const totalOrders = await OrderModel.countDocuments({ talentId });
  const pendingOrders = await OrderModel.countDocuments({ talentId, status: "pending" });
  const inProgressOrders = await OrderModel.countDocuments({ talentId, status: "in-progress" });
  const completedOrders = await OrderModel.countDocuments({ talentId, status: "completed" });

  const recentOrders = await OrderModel.find({ talentId })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();
  const recentOrdersWithUserNames = await Promise.all(
    recentOrders.map(async (order: any) => {
      const client = await UserModel.findById(order.clientId).select("userName").lean();
      return {
        _id: order._id.toString(),
        talentId: order.talentId,
        clientId: order.clientId,
        clientUserName: client?.userName || "Unknown",
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

  // Project-related data (based on accepted proposals)
  const acceptedProposals = await ProposalModel.find({
    talentId,
    proposalStatus: { $in: ["accepted", "delivered", "revision-requested"] },
  }).lean();
  const relevantProjectIds = acceptedProposals.map((p) => p.projectId);
  const relevantProjects = await ProjectModel.find({ _id: { $in: relevantProjectIds } }).lean();
  const totalProjects = relevantProjects.length;
  const openProjects = relevantProjects.filter((p) => p.status === "open").length;
  const inProgressProjects = relevantProjects.filter((p) => p.status === "in-progress").length;
  const completedProjects = relevantProjects.filter((p) => p.status === "completed").length;
  const recentProjects = relevantProjects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  // Proposal data
  const totalProposals = await ProposalModel.countDocuments({ talentId });
  const pendingProposals = await ProposalModel.countDocuments({ talentId, proposalStatus: "pending" });
  const acceptedProposalsCount = await ProposalModel.countDocuments({ talentId, proposalStatus: "accepted" });
  const deliveredProposals = await ProposalModel.countDocuments({ talentId, proposalStatus: "delivered" });
  const recentProposals = await ProposalModel.find({ talentId })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();
  const recentProposalsWithDetails = await Promise.all(
    recentProposals.map(async (proposal: any) => {
      const talent = await UserModel.findById(proposal.talentId).select("userName").lean();
      const project = await ProjectModel.findById(proposal.projectId).select("title").lean();
      return {
        _id: proposal._id.toString(),
        projectId: proposal.projectId,
        talentId: proposal.talentId,
        talentUserName: talent?.userName || "Unknown",
        bid: proposal.bid,
        proposalStatus: proposal.proposalStatus,
        deliverables: proposal.deliverables
          ? {
              files: proposal.deliverables.files || [],
              note: proposal.deliverables.note || null,
              submittedAt: proposal.deliverables.submittedAt?.toISOString() || null,
            }
          : undefined,
        createdAt: proposal.createdAt.toISOString(),
        updatedAt: proposal.updatedAt.toISOString(),
      };
    })
  );

  return {
    totalOrders,
    pendingOrders,
    inProgressOrders,
    completedOrders,
    recentOrders: recentOrdersWithUserNames,
    totalProjects,
    openProjects,
    inProgressProjects,
    completedProjects,
    recentProjects,
    totalProposals,
    pendingProposals,
    acceptedProposals: acceptedProposalsCount,
    deliveredProposals,
    recentProposals: recentProposalsWithDetails,
  };
}

async function getClientDashboardData(clientId: string) {
  const totalProposals = await ProposalModel.countDocuments({
    projectId: { $in: await ProjectModel.find({ clientId }).distinct("_id") },
  });
  const pendingProposals = await ProposalModel.countDocuments({
    projectId: { $in: await ProjectModel.find({ clientId }).distinct("_id") },
    proposalStatus: "pending",
  });
  const acceptedProposals = await ProposalModel.countDocuments({
    projectId: { $in: await ProjectModel.find({ clientId }).distinct("_id") },
    proposalStatus: "accepted",
  });
  const deliveredProposals = await ProposalModel.countDocuments({
    projectId: { $in: await ProjectModel.find({ clientId }).distinct("_id") },
    proposalStatus: "delivered",
  });

  const recentProposals = await ProposalModel.find({
    projectId: { $in: await ProjectModel.find({ clientId }).distinct("_id") },
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const recentProposalsWithDetails = await Promise.all(
    recentProposals.map(async (proposal: any) => {
      const talent = await UserModel.findById(proposal.talentId)
        .select("userName")
        .lean();
      const project = await ProjectModel.findById(proposal.projectId)
        .select("title")
        .lean();
      return {
        _id: proposal._id.toString(),
        projectId: proposal.projectId,
        talentId: proposal.talentId,
        talentUserName: talent?.userName || "Unknown",
        bid: proposal.bid,
        proposalStatus: proposal.proposalStatus,
        deliverables: proposal.deliverables
          ? {
              files: proposal.deliverables.files || [],
              note: proposal.deliverables.note || null,
              submittedAt:
                proposal.deliverables.submittedAt?.toISOString() || null,
            }
          : undefined,
        createdAt: proposal.createdAt.toISOString(),
        updatedAt: proposal.updatedAt.toISOString(),
      };
    })
  );

  return {
    totalProposals,
    pendingProposals,
    acceptedProposals,
    deliveredProposals,
    recentProposals: recentProposalsWithDetails,
  };
}

io.on("connection", (socket: Socket & { userId?: string; role?: string }) => {
  console.log(`User connected: ${socket.userId}`);

  socket.join(socket.userId!);

  socket.on("getDashboardData", async ({ timeRange }) => {
    try {
      if (socket.role === "talent") {
        const data = await getTalentDashboardData(socket.userId!);
        socket.emit("dashboardUpdate", data);
      } else {
        const data = await getDashboardData(timeRange);
        socket.emit("dashboardUpdate", data);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      socket.emit("error", { message: "Failed to fetch dashboard data" });
    }
  });

  socket.on("orderCreated", async () => {
    if (socket.role === "talent") {
      const data = await getTalentDashboardData(socket.userId!);
      socket.emit("dashboardUpdate", data);
    } else {
      const data = await getDashboardData("30");
      socket.emit("dashboardUpdate", data);
    }
  });

  socket.on("orderStatusUpdated", async () => {
    if (socket.role === "talent") {
      const data = await getTalentDashboardData(socket.userId!);
      socket.emit("dashboardUpdate", data);
    } else {
      const data = await getDashboardData("30");
      socket.emit("dashboardUpdate", data);
    }
  });

  socket.on("paymentStatusUpdated", async () => {
    if (socket.role === "talent") {
      const data = await getTalentDashboardData(socket.userId!);
      socket.emit("dashboardUpdate", data);
    } else {
      const data = await getDashboardData("30");
      socket.emit("dashboardUpdate", data);
    }
  });

  socket.on(
    "deliverablesSubmitted",
    (data: { orderId: string; message: string; clientId: string }) => {
      io.to(data.clientId).emit("deliverablesSubmitted", {
        orderId: data.orderId,
        message: data.message,
      });
    }
  );

  socket.on(
    "proposalDeliverablesSubmitted",
    async (data: {
      proposalId: string;
      projectId: string;
      message: string;
      clientId: string;
      projectStatus: string;
    }) => {
      io.to(data.clientId).emit("proposalDeliverablesSubmitted", {
        proposalId: data.proposalId,
        projectId: data.projectId,
        message: data.message,
        projectStatus: data.projectStatus,
      });
      if (socket.role === "user") {
        const clientData = await getClientDashboardData(socket.userId!);
        socket.emit("dashboardUpdate", clientData);
      }
    }
  );

  socket.on(
    "projectCompleted",
    async (data: { projectId: string; message: string }) => {
      const project = await ProjectModel.findById(
        data.projectId
      ).lean<IProject>();
      if (project && project.clientId) {
        const proposal = await ProposalModel.findOne({
          projectId: data.projectId,
          proposalStatus: { $in: ["delivered", "revision-requested"] },
        }).lean<IProposal>();
        if (proposal && proposal.talentId) {
          const notification = new NotificationModel({
            userId: proposal.talentId,
            projectId: project._id,
            message: data.message,
            read: false,
          });
          await notification.save();
          io.to(proposal.talentId.toString()).emit("projectCompleted", {
            projectId: data.projectId,
            message: data.message,
          });
        }
      }
    }
  );

  setupMessagingHandlers(io, socket);

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
});

connectDB().then(async () => {
  const projectChangeStream = ProjectModel.watch();
  const proposalChangeStream = ProposalModel.watch();
  const orderChangeStream = OrderModel.watch();
  const messageChangeStream = MessageModel.watch();

  projectChangeStream.on("change", async (change) => {
    if (
      change.operationType === "update" &&
      change.updateDescription.updatedFields?.status === "completed"
    ) {
      const project = await ProjectModel.findById(
        change.documentKey._id
      ).lean<IProject>();
      if (project && project.clientId) {
        const proposal = await ProposalModel.findOne({
          projectId: project._id,
          proposalStatus: { $in: ["delivered", "revision-requested"] },
        }).lean<IProposal>();
        if (proposal && proposal.talentId) {
          const notification = new NotificationModel({
            userId: proposal.talentId,
            projectId: project._id,
            message: `Project ${project.title} has been marked as completed.`,
            read: false,
          });
          await notification.save();
          io.to(proposal.talentId.toString()).emit("projectCompleted", {
            projectId: project._id.toString(),
            message: `Project ${project.title} has been marked as completed.`,
          });
        }
      }
    }
    // Emit updated dashboard data including project metrics
    const data = await getDashboardData("30");
    io.emit("dashboardUpdate", data);
  });

  proposalChangeStream.on("change", async (change) => {
    if (
      change.operationType === "update" &&
      change.updateDescription.updatedFields?.deliverables
    ) {
      const proposal = await ProposalModel.findById(
        change.documentKey._id
      ).lean<IProposal>();
      if (proposal && proposal.projectId) {
        const project = await ProjectModel.findById(
          proposal.projectId
        ).lean<IProject>();
        if (project && project.clientId) {
          const notification = new NotificationModel({
            userId: project.clientId,
            projectId: project._id,
            message: `Deliverables submitted for proposal on project: ${project.title}`,
            read: false,
          });
          await notification.save();
          io.to(project.clientId.toString()).emit(
            "proposalDeliverablesSubmitted",
            {
              proposalId: proposal._id.toString(),
              projectId: project._id.toString(),
              message: `Deliverables submitted for proposal on project: ${project.title}`,
              projectStatus: project.status,
            }
          );
          const clientData = await getClientDashboardData(
            project.clientId.toString()
          );
          io.to(project.clientId.toString()).emit(
            "dashboardUpdate",
            clientData
          );
        }
      }
    } else if (
      change.operationType === "update" &&
      change.updateDescription.updatedFields?.proposalStatus
    ) {
      const proposal = await ProposalModel.findById(
        change.documentKey._id
      ).lean<IProposal>();
      if (proposal && proposal.talentId && proposal.projectId) {
        const project = await ProjectModel.findById(
          proposal.projectId
        ).lean<IProject>();
        if (project) {
          const status = change.updateDescription.updatedFields.proposalStatus;
          const notification = new NotificationModel({
            userId: proposal.talentId,
            projectId: project._id,
            message: `Your proposal for project ${project.title} has been ${status}.`,
            read: false,
          });
          await notification.save();
          io.to(proposal.talentId.toString()).emit(
            `proposal${status.charAt(0).toUpperCase() + status.slice(1)}`,
            {
              proposalId: proposal._id.toString(),
              projectId: project._id.toString(),
              message: `Your proposal for project ${project.title} has been ${status}.`,
            }
          );
        }
      }
    }
    const data = await getDashboardData("30");
    io.emit("dashboardUpdate", data);
  });

  orderChangeStream.on("change", async (change) => {
    if (change.operationType === "insert") {
      io.emit("orderCreated");
      const order = await OrderModel.findById(change.documentKey._id).lean<IOrder | null>();
      if (order && order.talentId) {
        const data = await getTalentDashboardData(order.talentId.toString());
        io.to(order.talentId.toString()).emit("dashboardUpdate", data);
      }
    } else if (
      change.operationType === "update" &&
      (change.updateDescription.updatedFields?.status || change.updateDescription.updatedFields?.paymentStatus)
    ) {
      io.emit("orderStatusUpdated");
      const order = await OrderModel.findById(change.documentKey._id).lean<IOrder | null>();
      if (order && order.talentId) {
        const data = await getTalentDashboardData(order.talentId.toString());
        io.to(order.talentId.toString()).emit("dashboardUpdate", data);
      }
      if (change.updateDescription.updatedFields?.paymentStatus) {
        io.emit("paymentStatusUpdated");
      }
      if (
        change.updateDescription.updatedFields?.status === "completed" &&
        change.updateDescription.updatedFields?.deliverables
      ) {
        if (order && order.clientId && order.projectDetails) {
          const notification = new NotificationModel({
            userId: order.clientId,
            orderId: order._id,
            message: `Deliverables submitted for order: ${order.projectDetails.title}`,
            read: false,
          });
          await notification.save();
          io.to(order.clientId.toString()).emit("deliverablesSubmitted", {
            orderId: order._id.toString(),
            message: `Deliverables submitted for order: ${order.projectDetails.title}`,
          });
        }
      }
    }
    const data = await getDashboardData("30");
    io.emit("dashboardUpdate", data);
  });

  messageChangeStream.on("change", async (change) => {
    if (change.operationType === "insert") {
      const message = await MessageModel.findById(change.documentKey._id)
        .populate<{ senderId: { userName: string } }>({
          path: "senderId",
          select: "userName",
        })
        .lean<LeanMessage>();
      if (message) {
        io.to(message.senderId.toString()).emit("newMessage", message);
        io.to(message.receiverId.toString()).emit("newMessage", message);
      }
    } else if (
      change.operationType === "update" &&
      change.updateDescription.updatedFields?.content
    ) {
      const message = await MessageModel.findById(change.documentKey._id)
        .populate<{ senderId: { userName: string } }>({
          path: "senderId",
          select: "userName",
        })
        .lean<LeanMessage>();
      if (message) {
        io.to(message.senderId.toString()).emit("messageUpdated", message);
        io.to(message.receiverId.toString()).emit("messageUpdated", message);
      }
    } else if (
      change.operationType === "update" &&
      change.updateDescription.updatedFields?.deletedAt
    ) {
      const message = await MessageModel.findById(change.documentKey._id)
        .populate<{ senderId: { userName: string } }>({
          path: "senderId",
          select: "userName",
        })
        .lean<LeanMessage>();
      if (message) {
        io.to(message.senderId.toString()).emit("messageDeleted", {
          messageId: message._id,
        });
        io.to(message.receiverId.toString()).emit("messageDeleted", {
          messageId: message._id,
        });
      }
    }
  });

  server.listen(PORT, () => {
    console.log(`Socket.IO server running on port ${PORT}`);
  });
});