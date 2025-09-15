import { Socket } from "socket.io";

export interface DashboardData {
  totalOrders: number;
  ordersByStatus: {
    pending: number;
    inProgress: number;
    accepted: number;
    rejected: number;
    delivered: number;
    completed: number;
    cancelled: number;
  };
  revisionStatusCounts: {
    none: number;
    requested: number;
    submitted: number;
  };
  totalProjects: number;
  projectsByStatus: {
    open: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
  projectsByCategory: { [key: string]: number };
  totalRevenue: number;
  totalTransactions: number;
  transactionsByStatus: {
    pending: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
  recentTransactions: {
    _id: string;
    orderId: string;
    clientUserName: string;
    talentUserName: string;
    amount: number;
    paymentStatus: "pending" | "completed" | "failed" | "cancelled";
    createdAt: string;
    updatedAt: string;
  }[];
  recentOrders: {
    _id: string;
    talentId: string;
    clientId: string;
    clientUserName: string;
    talentUserName: string;
    ratePlan: {
      type: "Basic" | "Standard" | "Premium";
      price: number;
      description: string;
      whatsIncluded: string[];
      deliveryDays: number;
      revisions: number;
    };
    projectDetails: {
      title: string;
      description: string;
    };
    status: string;
    revisionStatus: string;
    revisionCount: number;
    createdAt: string;
    updatedAt: string;
    revisionRequest?: {
      files: string[];
      note?: string;
      requestedAt: string;
    };
  }[];
  recentProjects: {
    _id: string;
    clientId: string;
    clientUserName: string;
    title: string;
    category: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }[];
}

export interface LeanMessage {
  _id: string;
  senderId: { userName: string | null };
  receiverId: string;
  content: string;
  conversationId: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  isRead: boolean;
}

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  role?: string;
}