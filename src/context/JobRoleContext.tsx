"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { IJobRole } from "@/db/models/JobRole"; // Import the JobRole interface
import { toast } from "sonner"; // Assuming Shadcn/UI toast

// Define the API response type based on the route.ts
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  issues?: Record<string, string[]>;
}

// Context value type
interface JobRoleContextType {
  jobRoles: IJobRole[];
  isLoading: boolean;
  error: string | null;
  fetchJobRoles: (hrId: string) => Promise<void>;
}

// Create the context
const JobRoleContext = createContext<JobRoleContextType | undefined>(undefined);

// Context provider props
interface JobRoleProviderProps {
  children: React.ReactNode;
}

// Context provider component
export const JobRoleProvider: React.FC<JobRoleProviderProps> = ({
  children,
}) => {
  const [jobRoles, setJobRoles] = useState<IJobRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch job roles by hrId
  const fetchJobRoles = useCallback(async (hrId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/jobRole?hr=${hrId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const result: ApiResponse<IJobRole[]> = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `HTTP error! Status: ${response.status}`
        );
      }

      if (result.success && result.data) {
        setJobRoles(result.data);
        toast.success(result.message || "Job roles fetched successfully");
      } else {
        throw new Error(result.error || "Failed to fetch job roles");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      toast.error(errorMessage || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <JobRoleContext.Provider
      value={{ jobRoles, isLoading, error, fetchJobRoles }}
    >
      {children}
    </JobRoleContext.Provider>
  );
};

// Custom hook to use the context
export const useJobRoles = (): JobRoleContextType => {
  const context = useContext(JobRoleContext);
  if (!context) {
    throw new Error("useJobRoles must be used within a JobRoleProvider");
  }
  return context;
};
