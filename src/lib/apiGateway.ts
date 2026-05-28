import { 
  collection, 
  query, 
  getDocs, 
  getDoc,
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  where,
  orderBy,
  limit,
  serverTimestamp
} from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "./firebase";

// Unified Types for Gateway Entities
export interface APIGatewayUser {
  id: string;
  email?: string;
  displayName?: string;
  role?: "superadmin" | "admin" | "student" | "guest" | string;
  planId?: "free" | "premium" | string;
  classGroup?: string;
  photoURL?: string | null;
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

export interface APIGatewayMaterial {
  id: string;
  title: string;
  description?: string;
  type?: "video" | "document" | "test" | string;
  category?: string;
  url?: string;
  createdAt?: any;
  [key: string]: any;
}

export interface APIGatewayMentor {
  id: string;
  name: string;
  subject?: string;
  bio?: string;
  photoURL?: string;
  createdAt?: any;
  [key: string]: any;
}

export interface APIGatewayActiveDevice {
  id: string;
  userId: string;
  deviceId?: string;
  deviceName?: string;
  browser?: string;
  os?: string;
  ip?: string;
  lastActive?: any;
  [key: string]: any;
}

export interface APIGatewaySecurityViolation {
  id: string;
  userId?: string;
  email?: string;
  type: string;
  reason?: string;
  timestamp?: any;
  details?: any;
}

export interface APITelemetryLog {
  endpoint: string;
  method: string;
  latencyMs: number;
  success: boolean;
  timestamp: string;
  errorMessage?: string;
}

// Telemetry Listener Callback Signature
export type TelemetryListener = (log: APITelemetryLog) => void;

class APIGatewayService {
  private telemetryListeners: Set<TelemetryListener> = new Set();
  private gatewayLogs: APITelemetryLog[] = [];
  private readonly maxLogSize = 50;

  // Subscribe to Live API Telemetry Traces
  public subscribeTelemetry(listener: TelemetryListener): () => void {
    this.telemetryListeners.add(listener);
    return () => {
      this.telemetryListeners.delete(listener);
    };
  }

  // Get current sliding window of execution trace logs
  public getLogs(): APITelemetryLog[] {
    return [...this.gatewayLogs];
  }

  // Private logger helper that calculates performance timing and broadcasts telemetry
  private async executeWithTelemetry<T>(
    endpoint: string,
    method: string,
    opType: OperationType,
    path: string | null,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await fn();
      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);

      this.recordTelemetry(endpoint, method, latencyMs, true);
      return result;
    } catch (error) {
      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);
      const errMsg = error instanceof Error ? error.message : String(error);

      this.recordTelemetry(endpoint, method, latencyMs, false, errMsg);
      handleFirestoreError(error, opType, path);
    }
  }

  private recordTelemetry(
    endpoint: string,
    method: string,
    latencyMs: number,
    success: boolean,
    errorMessage?: string
  ) {
    const log: APITelemetryLog = {
      endpoint,
      method,
      latencyMs,
      success,
      timestamp: new Date().toISOString(),
      errorMessage
    };

    // Keep sliding-window logs
    this.gatewayLogs.unshift(log);
    if (this.gatewayLogs.length > this.maxLogSize) {
      this.gatewayLogs.pop();
    }

    // Broadcast to UI subscribers
    this.telemetryListeners.forEach((listener) => {
      try {
        listener(log);
      } catch (err) {
        console.error("Telemetry listener error:", err);
      }
    });

    // Mirror to standard development logs if failed or slow
    if (!success) {
      console.warn(`[API Gateway] Call fail: ${method} ${endpoint} - Error: ${errorMessage}`);
    } else if (latencyMs > 800) {
      console.info(`[API Gateway] Slow transaction: ${method} ${endpoint} spent ${latencyMs}ms`);
    }
  }

  // Check absolute user context verification
  private ensureAuthenticated(): { uid: string; email: string | null } {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("unauthenticated: Active session context required for Gateway API operations.");
    }
    return { uid: currentUser.uid, email: currentUser.email };
  }

  // ===============================
  // 1. Content Engine (Materials) API
  // ===============================
  public readonly materials = {
    list: async (limitCount?: number): Promise<APIGatewayMaterial[]> => {
      return this.executeWithTelemetry(
        "materials",
        "GET",
        OperationType.LIST,
        "materials",
        async () => {
          let q = query(collection(db, "materials"));
          if (limitCount && limitCount > 0) {
            q = query(q, limit(limitCount));
          }
          const snap = await getDocs(q);
          return snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data()
          })) as APIGatewayMaterial[];
        }
      );
    },

    get: async (id: string): Promise<APIGatewayMaterial | null> => {
      return this.executeWithTelemetry(
        `materials/${id}`,
        "GET",
        OperationType.GET,
        `materials/${id}`,
        async () => {
          const snap = await getDoc(doc(db, "materials", id));
          if (!snap.exists()) return null;
          return { id: snap.id, ...snap.data() } as APIGatewayMaterial;
        }
      );
    },

    create: async (data: Omit<APIGatewayMaterial, "id">): Promise<string> => {
      this.ensureAuthenticated();
      return this.executeWithTelemetry(
        "materials",
        "POST",
        OperationType.CREATE,
        "materials",
        async () => {
          const docRef = await addDoc(collection(db, "materials"), {
            ...data,
            createdAt: data.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          return docRef.id;
        }
      );
    },

    update: async (id: string, data: Partial<APIGatewayMaterial>): Promise<void> => {
      this.ensureAuthenticated();
      return this.executeWithTelemetry(
        `materials/${id}`,
        "PATCH",
        OperationType.UPDATE,
        `materials/${id}`,
        async () => {
          const docRef = doc(db, "materials", id);
          await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
          });
        }
      );
    },

    delete: async (id: string): Promise<void> => {
      this.ensureAuthenticated();
      return this.executeWithTelemetry(
        `materials/${id}`,
        "DELETE",
        OperationType.DELETE,
        `materials/${id}`,
        async () => {
          await deleteDoc(doc(db, "materials", id));
        }
      );
    }
  };

  // ===============================
  // 2. Student Roster (Users) API
  // ===============================
  public readonly users = {
    list: async (): Promise<APIGatewayUser[]> => {
      this.ensureAuthenticated();
      return this.executeWithTelemetry(
        "users",
        "GET",
        OperationType.LIST,
        "users",
        async () => {
          const q = query(collection(db, "users"));
          const snap = await getDocs(q);
          return snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data()
          })) as APIGatewayUser[];
        }
      );
    },

    get: async (id: string): Promise<APIGatewayUser | null> => {
      return this.executeWithTelemetry(
        `users/${id}`,
        "GET",
        OperationType.GET,
        `users/${id}`,
        async () => {
          const snap = await getDoc(doc(db, "users", id));
          if (!snap.exists()) return null;
          return { id: snap.id, ...snap.data() } as APIGatewayUser;
        }
      );
    },

    update: async (id: string, data: Partial<APIGatewayUser>): Promise<void> => {
      this.ensureAuthenticated();
      return this.executeWithTelemetry(
        `users/${id}`,
        "PATCH",
        OperationType.UPDATE,
        `users/${id}`,
        async () => {
          const docRef = doc(db, "users", id);
          await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
          });
        }
      );
    },

    delete: async (id: string): Promise<void> => {
      this.ensureAuthenticated();
      return this.executeWithTelemetry(
        `users/${id}`,
        "DELETE",
        OperationType.DELETE,
        `users/${id}`,
        async () => {
          await deleteDoc(doc(db, "users", id));
        }
      );
    }
  };

  // ===============================
  // 3. Faculty / Mentors API
  // ===============================
  public readonly mentors = {
    list: async (): Promise<APIGatewayMentor[]> => {
      return this.executeWithTelemetry(
        "mentors",
        "GET",
        OperationType.LIST,
        "mentors",
        async () => {
          const q = query(collection(db, "mentors"), orderBy("createdAt", "desc"));
          const snap = await getDocs(q);
          return snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data()
          })) as APIGatewayMentor[];
        }
      );
    },

    create: async (data: Omit<APIGatewayMentor, "id">): Promise<string> => {
      this.ensureAuthenticated();
      return this.executeWithTelemetry(
        "mentors",
        "POST",
        OperationType.CREATE,
        "mentors",
        async () => {
          const docRef = await addDoc(collection(db, "mentors"), {
            ...data,
            createdAt: data.createdAt || serverTimestamp()
          });
          return docRef.id;
        }
      );
    },

    update: async (id: string, data: Partial<APIGatewayMentor>): Promise<void> => {
      this.ensureAuthenticated();
      return this.executeWithTelemetry(
        `mentors/${id}`,
        "PATCH",
        OperationType.UPDATE,
        `mentors/${id}`,
        async () => {
          const docRef = doc(db, "mentors", id);
          await updateDoc(docRef, data);
        }
      );
    },

    delete: async (id: string): Promise<void> => {
      this.ensureAuthenticated();
      return this.executeWithTelemetry(
        `mentors/${id}`,
        "DELETE",
        OperationType.DELETE,
        `mentors/${id}`,
        async () => {
          await deleteDoc(doc(db, "mentors", id));
        }
      );
    }
  };

  // ===============================
  // 4. Global Settings API
  // ===============================
  public readonly settings = {
    getGlobal: async (): Promise<any> => {
      return this.executeWithTelemetry(
        "settings/global",
        "GET",
        OperationType.GET,
        "settings/global",
        async () => {
          const snap = await getDoc(doc(db, "settings", "global"));
          if (snap.exists()) {
            return snap.data();
          }
          return null;
        }
      );
    },

    updateGlobal: async (data: Record<string, any>): Promise<void> => {
      this.ensureAuthenticated();
      return this.executeWithTelemetry(
        "settings/global",
        "PUT",
        OperationType.WRITE,
        "settings/global",
        async () => {
          const docRef = doc(db, "settings", "global");
          await setDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      );
    }
  };

  // ===============================
  // 5. System Active Devices API
  // ===============================
  public readonly activeDevices = {
    listAll: async (): Promise<APIGatewayActiveDevice[]> => {
      this.ensureAuthenticated();
      return this.executeWithTelemetry(
        "active_devices",
        "GET",
        OperationType.LIST,
        "active_devices",
        async () => {
          const snap = await getDocs(collection(db, "active_devices"));
          return snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data()
          })) as APIGatewayActiveDevice[];
        }
      );
    },

    listForUser: async (userId: string): Promise<APIGatewayActiveDevice[]> => {
      this.ensureAuthenticated();
      return this.executeWithTelemetry(
        `active_devices/user/${userId}`,
        "GET",
        OperationType.LIST,
        "active_devices",
        async () => {
          const q = query(collection(db, "active_devices"), where("userId", "==", userId));
          const snap = await getDocs(q);
          return snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data()
          })) as APIGatewayActiveDevice[];
        }
      );
    },

    register: async (data: Omit<APIGatewayActiveDevice, "id">): Promise<string> => {
      return this.executeWithTelemetry(
        "active_devices",
        "POST",
        OperationType.CREATE,
        "active_devices",
        async () => {
          const docRef = await addDoc(collection(db, "active_devices"), {
            ...data,
            lastActive: serverTimestamp()
          });
          return docRef.id;
        }
      );
    },

    deregister: async (id: string): Promise<void> => {
      return this.executeWithTelemetry(
        `active_devices/${id}`,
        "DELETE",
        OperationType.DELETE,
        `active_devices/${id}`,
        async () => {
          await deleteDoc(doc(db, "active_devices", id));
        }
      );
    }
  };

  // ===============================
  // 6. Security Violations & Logs API
  // ===============================
  public readonly securityViolations = {
    list: async (): Promise<APIGatewaySecurityViolation[]> => {
      this.ensureAuthenticated();
      return this.executeWithTelemetry(
        "security_violations",
        "GET",
        OperationType.LIST,
        "security_violations",
        async () => {
          const snap = await getDocs(collection(db, "security_violations"));
          return snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data()
          })) as APIGatewaySecurityViolation[];
        }
      );
    },

    report: async (data: Omit<APIGatewaySecurityViolation, "id">): Promise<string> => {
      return this.executeWithTelemetry(
        "security_violations",
        "POST",
        OperationType.CREATE,
        "security_violations",
        async () => {
          const docRef = await addDoc(collection(db, "security_violations"), {
            ...data,
            timestamp: serverTimestamp()
          });
          return docRef.id;
        }
      );
    }
  };

  // ===============================
  // 7. Login History API
  // ===============================
  public readonly loginHistory = {
    record: async (data: Record<string, any>): Promise<string> => {
      return this.executeWithTelemetry(
        "login_history",
        "POST",
        OperationType.CREATE,
        "login_history",
        async () => {
          const docRef = await addDoc(collection(db, "login_history"), {
            ...data,
            timestamp: serverTimestamp()
          });
          return docRef.id;
        }
      );
    }
  };
}

export const apiGateway = new APIGatewayService();
