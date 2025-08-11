export interface AuthUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "user" | "facility_owner" | "admin";
  phone?: string;
  profileImage?: string;
  skillLevel?: "beginner" | "intermediate" | "advanced";
  createdAt: string;
  isEmailVerified?: boolean;
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  setUser: (user: AuthUser | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "user" | "facility_owner" | "admin";
  phone?: string;
  skillLevel?: "beginner" | "intermediate" | "advanced";
}

export interface FacilityFilters {
  city?: string;
  sportType?: string;
  searchTerm?: string;
}

export interface MatchFilters {
  city?: string;
  sportType?: string;
  skillLevel?: string;
}

export interface BookingData {
  facilityId: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  totalAmount: number;
  notes?: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  price: number;
}
