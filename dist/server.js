"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const connectDB_1 = __importDefault(require("./src/lib/connectDB"));
const auth_1 = require("./src/socket/middleware/auth");
const dashboard_1 = require("./src/socket/handlers/admin/dashboard");
const messaging_1 = require("./src/socket/handlers/messaging");
const projects_model_1 = __importDefault(require("./src/models/projects.model"));
const proposal_model_1 = __importDefault(require("./src/models/proposal.model"));
const order_model_1 = __importDefault(require("./src/models/order.model"));
const message_model_1 = __importDefault(require("./src/models/message.model"));
const notification_model_1 = __importDefault(require("./src/models/notification.model"));
const user_model_1 = __importDefault(require("./src/models/user.model"));
dotenv_1.default.config();
const PORT = process.env.SOCKET_PORT || 4000;
const server = http_1.default.createServer();
const allowedOrigins = process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL.split(",")
    : ["http://localhost:3000"];
const io = new socket_io_1.Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
    },
});
io.use(auth_1.authMiddleware);
async function getTalentDashboardData(talentId) {
    const totalOrders = await order_model_1.default.countDocuments({ talentId });
    const pendingOrders = await order_model_1.default.countDocuments({ talentId, status: "pending" });
    const inProgressOrders = await order_model_1.default.countDocuments({ talentId, status: "in-progress" });
    const completedOrders = await order_model_1.default.countDocuments({ talentId, status: "completed" });
    const recentOrders = await order_model_1.default.find({ talentId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
    const recentOrdersWithUserNames = await Promise.all(recentOrders.map(async (order) => {
        var _a;
        const client = await user_model_1.default.findById(order.clientId).select("userName").lean();
        return {
            _id: order._id.toString(),
            talentId: order.talentId,
            clientId: order.clientId,
            clientUserName: (client === null || client === void 0 ? void 0 : client.userName) || "Unknown",
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
    // Project-related data (based on accepted proposals)
    const acceptedProposals = await proposal_model_1.default.find({
        talentId,
        proposalStatus: { $in: ["accepted", "delivered", "revision-requested"] },
    }).lean();
    const relevantProjectIds = acceptedProposals.map((p) => p.projectId);
    const relevantProjects = await projects_model_1.default.find({ _id: { $in: relevantProjectIds } }).lean();
    const totalProjects = relevantProjects.length;
    const openProjects = relevantProjects.filter((p) => p.status === "open").length;
    const inProgressProjects = relevantProjects.filter((p) => p.status === "in-progress").length;
    const completedProjects = relevantProjects.filter((p) => p.status === "completed").length;
    const recentProjects = relevantProjects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
    // Proposal data
    const totalProposals = await proposal_model_1.default.countDocuments({ talentId });
    const pendingProposals = await proposal_model_1.default.countDocuments({ talentId, proposalStatus: "pending" });
    const acceptedProposalsCount = await proposal_model_1.default.countDocuments({ talentId, proposalStatus: "accepted" });
    const deliveredProposals = await proposal_model_1.default.countDocuments({ talentId, proposalStatus: "delivered" });
    const recentProposals = await proposal_model_1.default.find({ talentId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
    const recentProposalsWithDetails = await Promise.all(recentProposals.map(async (proposal) => {
        var _a;
        const talent = await user_model_1.default.findById(proposal.talentId).select("userName").lean();
        const project = await projects_model_1.default.findById(proposal.projectId).select("title").lean();
        return {
            _id: proposal._id.toString(),
            projectId: proposal.projectId,
            talentId: proposal.talentId,
            talentUserName: (talent === null || talent === void 0 ? void 0 : talent.userName) || "Unknown",
            bid: proposal.bid,
            proposalStatus: proposal.proposalStatus,
            deliverables: proposal.deliverables
                ? {
                    files: proposal.deliverables.files || [],
                    note: proposal.deliverables.note || null,
                    submittedAt: ((_a = proposal.deliverables.submittedAt) === null || _a === void 0 ? void 0 : _a.toISOString()) || null,
                }
                : undefined,
            createdAt: proposal.createdAt.toISOString(),
            updatedAt: proposal.updatedAt.toISOString(),
        };
    }));
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
async function getClientDashboardData(clientId) {
    const totalProposals = await proposal_model_1.default.countDocuments({
        projectId: { $in: await projects_model_1.default.find({ clientId }).distinct("_id") },
    });
    const pendingProposals = await proposal_model_1.default.countDocuments({
        projectId: { $in: await projects_model_1.default.find({ clientId }).distinct("_id") },
        proposalStatus: "pending",
    });
    const acceptedProposals = await proposal_model_1.default.countDocuments({
        projectId: { $in: await projects_model_1.default.find({ clientId }).distinct("_id") },
        proposalStatus: "accepted",
    });
    const deliveredProposals = await proposal_model_1.default.countDocuments({
        projectId: { $in: await projects_model_1.default.find({ clientId }).distinct("_id") },
        proposalStatus: "delivered",
    });
    const recentProposals = await proposal_model_1.default.find({
        projectId: { $in: await projects_model_1.default.find({ clientId }).distinct("_id") },
    })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
    const recentProposalsWithDetails = await Promise.all(recentProposals.map(async (proposal) => {
        var _a;
        const talent = await user_model_1.default.findById(proposal.talentId)
            .select("userName")
            .lean();
        const project = await projects_model_1.default.findById(proposal.projectId)
            .select("title")
            .lean();
        return {
            _id: proposal._id.toString(),
            projectId: proposal.projectId,
            talentId: proposal.talentId,
            talentUserName: (talent === null || talent === void 0 ? void 0 : talent.userName) || "Unknown",
            bid: proposal.bid,
            proposalStatus: proposal.proposalStatus,
            deliverables: proposal.deliverables
                ? {
                    files: proposal.deliverables.files || [],
                    note: proposal.deliverables.note || null,
                    submittedAt: ((_a = proposal.deliverables.submittedAt) === null || _a === void 0 ? void 0 : _a.toISOString()) || null,
                }
                : undefined,
            createdAt: proposal.createdAt.toISOString(),
            updatedAt: proposal.updatedAt.toISOString(),
        };
    }));
    return {
        totalProposals,
        pendingProposals,
        acceptedProposals,
        deliveredProposals,
        recentProposals: recentProposalsWithDetails,
    };
}
io.on("connection", (socket) => {
    console.log(`User connected: ${socket.userId}`);
    socket.join(socket.userId);
    socket.on("getDashboardData", async ({ timeRange }) => {
        try {
            if (socket.role === "talent") {
                const data = await getTalentDashboardData(socket.userId);
                socket.emit("dashboardUpdate", data);
            }
            else {
                const data = await (0, dashboard_1.getDashboardData)(timeRange);
                socket.emit("dashboardUpdate", data);
            }
        }
        catch (error) {
            console.error("Error fetching dashboard data:", error);
            socket.emit("error", { message: "Failed to fetch dashboard data" });
        }
    });
    socket.on("orderCreated", async () => {
        if (socket.role === "talent") {
            const data = await getTalentDashboardData(socket.userId);
            socket.emit("dashboardUpdate", data);
        }
        else {
            const data = await (0, dashboard_1.getDashboardData)("30");
            socket.emit("dashboardUpdate", data);
        }
    });
    socket.on("orderStatusUpdated", async () => {
        if (socket.role === "talent") {
            const data = await getTalentDashboardData(socket.userId);
            socket.emit("dashboardUpdate", data);
        }
        else {
            const data = await (0, dashboard_1.getDashboardData)("30");
            socket.emit("dashboardUpdate", data);
        }
    });
    socket.on("paymentStatusUpdated", async () => {
        if (socket.role === "talent") {
            const data = await getTalentDashboardData(socket.userId);
            socket.emit("dashboardUpdate", data);
        }
        else {
            const data = await (0, dashboard_1.getDashboardData)("30");
            socket.emit("dashboardUpdate", data);
        }
    });
    socket.on("deliverablesSubmitted", (data) => {
        io.to(data.clientId).emit("deliverablesSubmitted", {
            orderId: data.orderId,
            message: data.message,
        });
    });
    socket.on("proposalDeliverablesSubmitted", async (data) => {
        io.to(data.clientId).emit("proposalDeliverablesSubmitted", {
            proposalId: data.proposalId,
            projectId: data.projectId,
            message: data.message,
            projectStatus: data.projectStatus,
        });
        if (socket.role === "user") {
            const clientData = await getClientDashboardData(socket.userId);
            socket.emit("dashboardUpdate", clientData);
        }
    });
    socket.on("projectCompleted", async (data) => {
        const project = await projects_model_1.default.findById(data.projectId).lean();
        if (project && project.clientId) {
            const proposal = await proposal_model_1.default.findOne({
                projectId: data.projectId,
                proposalStatus: { $in: ["delivered", "revision-requested"] },
            }).lean();
            if (proposal && proposal.talentId) {
                const notification = new notification_model_1.default({
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
    });
    (0, messaging_1.setupMessagingHandlers)(io, socket);
    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.userId}`);
    });
});
(0, connectDB_1.default)().then(async () => {
    const projectChangeStream = projects_model_1.default.watch();
    const proposalChangeStream = proposal_model_1.default.watch();
    const orderChangeStream = order_model_1.default.watch();
    const messageChangeStream = message_model_1.default.watch();
    projectChangeStream.on("change", async (change) => {
        var _a;
        if (change.operationType === "update" &&
            ((_a = change.updateDescription.updatedFields) === null || _a === void 0 ? void 0 : _a.status) === "completed") {
            const project = await projects_model_1.default.findById(change.documentKey._id).lean();
            if (project && project.clientId) {
                const proposal = await proposal_model_1.default.findOne({
                    projectId: project._id,
                    proposalStatus: { $in: ["delivered", "revision-requested"] },
                }).lean();
                if (proposal && proposal.talentId) {
                    const notification = new notification_model_1.default({
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
        const data = await (0, dashboard_1.getDashboardData)("30");
        io.emit("dashboardUpdate", data);
    });
    proposalChangeStream.on("change", async (change) => {
        var _a, _b;
        if (change.operationType === "update" &&
            ((_a = change.updateDescription.updatedFields) === null || _a === void 0 ? void 0 : _a.deliverables)) {
            const proposal = await proposal_model_1.default.findById(change.documentKey._id).lean();
            if (proposal && proposal.projectId) {
                const project = await projects_model_1.default.findById(proposal.projectId).lean();
                if (project && project.clientId) {
                    const notification = new notification_model_1.default({
                        userId: project.clientId,
                        projectId: project._id,
                        message: `Deliverables submitted for proposal on project: ${project.title}`,
                        read: false,
                    });
                    await notification.save();
                    io.to(project.clientId.toString()).emit("proposalDeliverablesSubmitted", {
                        proposalId: proposal._id.toString(),
                        projectId: project._id.toString(),
                        message: `Deliverables submitted for proposal on project: ${project.title}`,
                        projectStatus: project.status,
                    });
                    const clientData = await getClientDashboardData(project.clientId.toString());
                    io.to(project.clientId.toString()).emit("dashboardUpdate", clientData);
                }
            }
        }
        else if (change.operationType === "update" &&
            ((_b = change.updateDescription.updatedFields) === null || _b === void 0 ? void 0 : _b.proposalStatus)) {
            const proposal = await proposal_model_1.default.findById(change.documentKey._id).lean();
            if (proposal && proposal.talentId && proposal.projectId) {
                const project = await projects_model_1.default.findById(proposal.projectId).lean();
                if (project) {
                    const status = change.updateDescription.updatedFields.proposalStatus;
                    const notification = new notification_model_1.default({
                        userId: proposal.talentId,
                        projectId: project._id,
                        message: `Your proposal for project ${project.title} has been ${status}.`,
                        read: false,
                    });
                    await notification.save();
                    io.to(proposal.talentId.toString()).emit(`proposal${status.charAt(0).toUpperCase() + status.slice(1)}`, {
                        proposalId: proposal._id.toString(),
                        projectId: project._id.toString(),
                        message: `Your proposal for project ${project.title} has been ${status}.`,
                    });
                }
            }
        }
        const data = await (0, dashboard_1.getDashboardData)("30");
        io.emit("dashboardUpdate", data);
    });
    orderChangeStream.on("change", async (change) => {
        var _a, _b, _c, _d, _e;
        if (change.operationType === "insert") {
            io.emit("orderCreated");
            const order = await order_model_1.default.findById(change.documentKey._id).lean();
            if (order && order.talentId) {
                const data = await getTalentDashboardData(order.talentId.toString());
                io.to(order.talentId.toString()).emit("dashboardUpdate", data);
            }
        }
        else if (change.operationType === "update" &&
            (((_a = change.updateDescription.updatedFields) === null || _a === void 0 ? void 0 : _a.status) || ((_b = change.updateDescription.updatedFields) === null || _b === void 0 ? void 0 : _b.paymentStatus))) {
            io.emit("orderStatusUpdated");
            const order = await order_model_1.default.findById(change.documentKey._id).lean();
            if (order && order.talentId) {
                const data = await getTalentDashboardData(order.talentId.toString());
                io.to(order.talentId.toString()).emit("dashboardUpdate", data);
            }
            if ((_c = change.updateDescription.updatedFields) === null || _c === void 0 ? void 0 : _c.paymentStatus) {
                io.emit("paymentStatusUpdated");
            }
            if (((_d = change.updateDescription.updatedFields) === null || _d === void 0 ? void 0 : _d.status) === "completed" &&
                ((_e = change.updateDescription.updatedFields) === null || _e === void 0 ? void 0 : _e.deliverables)) {
                if (order && order.clientId && order.projectDetails) {
                    const notification = new notification_model_1.default({
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
        const data = await (0, dashboard_1.getDashboardData)("30");
        io.emit("dashboardUpdate", data);
    });
    messageChangeStream.on("change", async (change) => {
        var _a, _b;
        if (change.operationType === "insert") {
            const message = await message_model_1.default.findById(change.documentKey._id)
                .populate({
                path: "senderId",
                select: "userName",
            })
                .lean();
            if (message) {
                io.to(message.senderId.toString()).emit("newMessage", message);
                io.to(message.receiverId.toString()).emit("newMessage", message);
            }
        }
        else if (change.operationType === "update" &&
            ((_a = change.updateDescription.updatedFields) === null || _a === void 0 ? void 0 : _a.content)) {
            const message = await message_model_1.default.findById(change.documentKey._id)
                .populate({
                path: "senderId",
                select: "userName",
            })
                .lean();
            if (message) {
                io.to(message.senderId.toString()).emit("messageUpdated", message);
                io.to(message.receiverId.toString()).emit("messageUpdated", message);
            }
        }
        else if (change.operationType === "update" &&
            ((_b = change.updateDescription.updatedFields) === null || _b === void 0 ? void 0 : _b.deletedAt)) {
            const message = await message_model_1.default.findById(change.documentKey._id)
                .populate({
                path: "senderId",
                select: "userName",
            })
                .lean();
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
