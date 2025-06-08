import { Schema, Document, Types, model } from "mongoose";

// Centralized Enums
export enum RoleName {
  Admin = "admin",
  HiringManager = "hiringManager",
  Interviewer = "interviewer",
}

export enum UserStatus {
  Unverified = "unverified",
  Verified = "verified",
  Suspended = "suspended",
}

export enum TeamStatus {
  Active = "active",
  Suspended = "suspended",
  Terminated = "terminated",
}

export enum TeamRoleName {
  Lead = "lead",
  Member = "member",
  Contributor = "contributor",
}

export enum WorkType {
  Hybrid = "hybrid",
  Onsite = "onsite",
  Remote = "remote",
}

export enum ContractType {
  FullTime = "fullTime",
  Internship = "internship",
  PartTime = "partTime",
  Freelance = "freelance",
  Temporary = "temporary",
}

export enum PipelineStatus {
  Upcoming = "upcoming",
  Ongoing = "ongoing",
  Completed = "completed",
}

export enum StageStatus {
  Upcoming = "upcoming",
  Ongoing = "ongoing",
  Completed = "completed",
  Skipped = "skipped",
  Terminated = "terminated",
}

export enum CandidateStatus {
  Applied = "applied",
  Shortlisted = "shortlisted",
  Interviewed = "interviewed",
  Offered = "offered",
  Rejected = "rejected",
}

export enum ApplicationSource {
  Referral = "referral",
  JobBoard = "jobBoard",
  Direct = "direct",
  Agency = "agency",
}

export enum InterviewStatus {
  Scheduled = "scheduled",
  Completed = "completed",
  Cancelled = "cancelled",
}

export enum Permission {
  ViewCandidates = "view_candidates",
  EditJobs = "edit_jobs",
  ManageTeams = "manage_teams",
  ViewReports = "view_reports",
  AssignInterviews = "assign_interviews",
}

export enum JobStatus {
  Draft = "draft",
  Open = "open",
  Closed = "closed",
  Cancelled = "cancelled",
}

export enum Action {
  Create = "create",
  Update = "update",
  Delete = "delete",
  View = "view",
  Assign = "assign",
}

export enum TargetType {
  User = "user",
  Candidate = "candidate",
  Job = "job",
  Stage = "stage",
  Interview = "interview",
  Checklist = "checklist",
  Note = "note",
  Attachment = "attachment",
  Team = "team",
  Department = "department",
}

export enum NoteType {
  General = "general",
  Interview = "interview",
  Feedback = "feedback",
}

// Common interface for timestamps
interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

// Roles Schema
interface IRole extends Document, Timestamps {
  name: RoleName;
  description: string;
}

/**
 * Schema for roles with unique name and description.
 */
const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, enum: Object.values(RoleName), required: true },
    description: { type: String, required: true },
  },
  { timestamps: true }
);

RoleSchema.index({ name: 1 }, { unique: true });

// Role Permissions Schema
interface IRolePermission extends Document, Timestamps {
  roleId: Types.ObjectId;
  permission: Permission;
}

/**
 * Schema for role permissions, linking roles to specific permissions.
 */
const RolePermissionSchema = new Schema<IRolePermission>(
  {
    roleId: { type: Schema.Types.ObjectId, ref: "Role", required: true },
    permission: {
      type: String,
      enum: Object.values(Permission),
      required: true,
    },
  },
  { timestamps: true }
);

RolePermissionSchema.index({ roleId: 1, permission: 1 }, { unique: true });

/**
 * Validates that the roleId exists before saving.
 */
RolePermissionSchema.pre("save", async function (next) {
  try {
    const permission = this as Document & IRolePermission;
    const role = await Role.findById(permission.roleId);
    if (!role) throw new Error("Invalid roleId");
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error("Unknown error occurred"));
  }
});

// Users Schema
interface IUser extends Document, Timestamps {
  name: string;
  email: string;
  avatar?: string;
  roleId: Types.ObjectId;
  status: UserStatus;
  joiningDate: Date;
}

/**
 * Schema for users with unique email and role assignment.
 */
const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    avatar: { type: String, default: undefined },
    roleId: { type: Schema.Types.ObjectId, ref: "Role", required: true },
    status: { type: String, enum: Object.values(UserStatus), required: true },
    joiningDate: { type: Date, required: true },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });

/**
 * Validates that the roleId exists before saving.
 */
UserSchema.pre("save", async function (next) {
  try {
    const user = this as Document & IUser;
    const role = await Role.findById(user.roleId);
    if (!role) throw new Error("Invalid roleId");
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error("Unknown error occurred"));
  }
});

// Credentials Schema
interface ICredential extends Document, Timestamps {
  userId: Types.ObjectId;
  password: string;
  verifyCode?: string;
  forgotCode?: string;
}

/**
 * Schema for user credentials with unique userId.
 */
const CredentialSchema = new Schema<ICredential>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    password: { type: String, required: true },
    verifyCode: { type: String, default: undefined },
    forgotCode: { type: String, default: undefined },
  },
  { timestamps: true }
);

CredentialSchema.index({ userId: 1 }, { unique: true });

/**
 * Validates that the userId exists before saving.
 */
CredentialSchema.pre("save", async function (next) {
  try {
    const credential = this as Document & ICredential;
    const user = await User.findById(credential.userId);
    if (!user) throw new Error("Invalid userId");
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error("Unknown error occurred"));
  }
});

// Teams Schema
interface ITeam extends Document, Timestamps {
  name: string;
  leaderId?: Types.ObjectId;
  status: TeamStatus;
}

/**
 * Schema for teams with unique name and optional leader.
 */
const TeamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true },
    leaderId: { type: Schema.Types.ObjectId, ref: "User", default: undefined },
    status: { type: String, enum: Object.values(TeamStatus), required: true },
  },
  { timestamps: true }
);

TeamSchema.index({ name: 1 }, { unique: true });

/**
 * Validates that the leaderId is a team member with 'lead' role and exists.
 */
TeamSchema.pre("save", async function (next) {
  try {
    const team = this as Document & ITeam;
    if (team.leaderId) {
      const [user, teamMember] = await Promise.all([
        User.findById(team.leaderId),
        TeamMember.findOne({
          teamId: team._id,
          userId: team.leaderId,
          teamRoleId: (
            await TeamRole.findOne({ name: TeamRoleName.Lead }).select("_id")
          )?._id,
        }),
      ]);
      if (!user) throw new Error("Invalid leaderId");
      if (!teamMember)
        throw new Error('Leader must be a team member with role "lead"');
    }
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error("Unknown error occurred"));
  }
});

/**
 * Deletes related TeamMember documents on team deletion.
 */
TeamSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    try {
      await TeamMember.deleteMany({ teamId: this._id });
      next();
    } catch (error: unknown) {
      next(
        error instanceof Error ? error : new Error("Unknown error occurred")
      );
    }
  }
);

// Team Roles Schema
interface ITeamRole extends Document, Timestamps {
  name: TeamRoleName;
  description: string;
}

/**
 * Schema for team roles with unique name.
 */
const TeamRoleSchema = new Schema<ITeamRole>(
  {
    name: { type: String, enum: Object.values(TeamRoleName), required: true },
    description: { type: String, required: true },
  },
  { timestamps: true }
);

TeamRoleSchema.index({ name: 1 }, { unique: true });

// Team Members Schema
interface ITeamMember extends Document, Timestamps {
  userId: Types.ObjectId;
  teamId: Types.ObjectId;
  teamRoleId: Types.ObjectId;
  joinedAt: Date;
}

/**
 * Schema for team members with unique user-team combination.
 */
const TeamMemberSchema = new Schema<ITeamMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    teamRoleId: {
      type: Schema.Types.ObjectId,
      ref: "TeamRole",
      required: true,
    },
    joinedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

TeamMemberSchema.index({ userId: 1, teamId: 1 }, { unique: true });

/**
 * Validates that userId, teamId, and teamRoleId exist before saving.
 */
TeamMemberSchema.pre("save", async function (next) {
  try {
    const member = this as Document & ITeamMember;
    const [user, team, role] = await Promise.all([
      User.findById(member.userId),
      Team.findById(member.teamId),
      TeamRole.findById(member.teamRoleId),
    ]);
    if (!user) throw new Error("Invalid userId");
    if (!team) throw new Error("Invalid teamId");
    if (!role) throw new Error("Invalid teamRoleId");
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error("Unknown error occurred"));
  }
});

// Departments Schema
interface IDepartment extends Document, Timestamps {
  name: string;
  description: string;
  hiringManagerId: Types.ObjectId;
}

/**
 * Schema for departments with unique name and hiring manager.
 */
const DepartmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    hiringManagerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

DepartmentSchema.index({ name: 1 }, { unique: true });

/**
 * Validates that hiringManagerId exists before saving.
 */
DepartmentSchema.pre("save", async function (next) {
  try {
    const department = this as Document & IDepartment;
    const user = await User.findById(department.hiringManagerId);
    if (!user) throw new Error("Invalid hiringManagerId");
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error("Unknown error occurred"));
  }
});

/**
 * Deletes related Job documents on department deletion.
 */
DepartmentSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    try {
      await Job.deleteMany({ departmentId: this._id });
      next();
    } catch (error: unknown) {
      next(
        error instanceof Error ? error : new Error("Unknown error occurred")
      );
    }
  }
);

// Jobs Schema
interface IJob extends Document, Timestamps {
  title: string;
  departmentId: Types.ObjectId;
  hiringManagerId: Types.ObjectId;
  hiringPipelineId: Types.ObjectId;
  workType: WorkType;
  workLocation: string;
  contract: ContractType;
  headCount: number;
  minimumSalary: number;
  maximumSalary: number;
  status: JobStatus;
  jobDescription: string;
}

/**
 * Schema for jobs with salary validation and references to department, hiring manager, and pipeline.
 */
const JobSchema = new Schema<IJob>(
  {
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department ID is required"],
    },
    hiringManagerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    hiringPipelineId: {
      type: Schema.Types.ObjectId,
      ref: "HiringPipeline",
      required: true,
    },
    workType: {
      type: String,
      enum: Object.values(WorkType),
      required: true,
      default: WorkType.Onsite,
    },
    workLocation: { type: String, required: true },
    contract: {
      type: String,
      enum: Object.values(ContractType),
      required: true,
      default: ContractType.FullTime,
    },
    headCount: { type: Number, required: true },
    minimumSalary: { type: Number, required: true },
    maximumSalary: {
      type: Number,
      required: true,
      validate: {
        validator: function (this: IJob, value: number) {
          return value >= this.minimumSalary;
        },
        message: "maximumSalary must be greater than or equal to minimumSalary",
      },
    },
    status: {
      type: String,
      enum: Object.values(JobStatus),
      default: JobStatus.Draft,
    },
    jobDescription: { type: String, required: true },
  },
  { timestamps: true }
);

JobSchema.index({ departmentId: 1 });
JobSchema.index({ hiringManagerId: 1 });
JobSchema.index({ hiringPipelineId: 1 });
JobSchema.index({ _id: -1 });

/**
 * Validates that departmentId, hiringManagerId, and hiringPipelineId exist before saving.
 */
JobSchema.pre("save", async function (next) {
  try {
    const job = this as Document & IJob;
    const [department, hiringManager, pipeline] = await Promise.all([
      Department.findById(job.departmentId),
      User.findById(job.hiringManagerId),
      HiringPipeline.findById(job.hiringPipelineId),
    ]);
    if (!department) throw new Error("Invalid departmentId");
    if (!hiringManager) throw new Error("Invalid hiringManagerId");
    if (!pipeline) throw new Error("Invalid hiringPipelineId");
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error("Unknown error occurred"));
  }
});

/**
 * Deletes related JobSkill, JobApplication, and ReferralToken documents on job deletion.
 */
JobSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    try {
      await Promise.all([
        JobSkill.deleteMany({ jobId: this._id }),
        JobApplication.deleteMany({ jobId: this._id }),
        ReferralToken.deleteMany({ jobId: this._id }),
      ]);
      next();
    } catch (error: unknown) {
      next(
        error instanceof Error ? error : new Error("Unknown error occurred")
      );
    }
  }
);

// Job Skills Schema
interface IJobSkill extends Document, Timestamps {
  jobId: Types.ObjectId;
  skill: string;
}

/**
 * Schema for job skills with unique job-skill combination.
 */
const JobSkillSchema = new Schema<IJobSkill>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    skill: { type: String, required: true },
  },
  { timestamps: true }
);

JobSkillSchema.index({ jobId: 1, skill: 1 }, { unique: true });

/**
 * Validates that jobId exists before saving.
 */
JobSkillSchema.pre("save", async function (next) {
  try {
    const skill = this as Document & IJobSkill;
    const job = await Job.findById(skill.jobId);
    if (!job) throw new Error("Invalid jobId");
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error("Unknown error occurred"));
  }
});

// Hiring Pipelines Schema
interface IHiringPipeline extends Document, Timestamps {
  name: string;
  description: string;
  status: PipelineStatus;
  createdById: Types.ObjectId;
}

/**
 * Schema for hiring pipelines with reference to creator.
 */
const HiringPipelineSchema = new Schema<IHiringPipeline>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(PipelineStatus),
      required: true,
    },
    createdById: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

HiringPipelineSchema.index({ createdById: 1 });

/**
 * Validates that createdById exists before saving.
 */
HiringPipelineSchema.pre("save", async function (next) {
  try {
    const pipeline = this as Document & IHiringPipeline;
    const user = await User.findById(pipeline.createdById);
    if (!user) throw new Error("Invalid createdById");
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error("Unknown error occurred"));
  }
});

/**
 * Deletes related HiringStage documents on pipeline deletion.
 */
HiringPipelineSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    try {
      await HiringStage.deleteMany({ pipelineId: this._id });
      next();
    } catch (error: unknown) {
      next(
        error instanceof Error ? error : new Error("Unknown error occurred")
      );
    }
  }
);

// Hiring Stages Schema
interface IHiringStage extends Document, Timestamps {
  pipelineId: Types.ObjectId;
  name: string;
  mandatory: boolean;
  schedule?: Date;
  status: StageStatus;
  maxCandidatesAllowed?: number;
  assignedToId?: Types.ObjectId;
}

/**
 * Schema for hiring stages with validation for mandatory status and schedule.
 */
const HiringStageSchema = new Schema<IHiringStage>(
  {
    pipelineId: {
      type: Schema.Types.ObjectId,
      ref: "HiringPipeline",
      required: true,
    },
    name: { type: String, required: true },
    mandatory: { type: Boolean, required: true },
    schedule: {
      type: Date,
      default: undefined,
      validate: {
        validator: (value: Date) => !value || value > new Date(),
        message: "Schedule must be a future date",
      },
    },
    status: { type: String, enum: Object.values(StageStatus), required: true },
    maxCandidatesAllowed: {
      type: Number,
      default: undefined,
      validate: {
        validator: (value: number) => !value || value > 0,
        message: "maxCandidatesAllowed must be a positive number",
      },
    },
    assignedToId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: undefined,
    },
  },
  { timestamps: true }
);

HiringStageSchema.index({ pipelineId: 1 });
HiringStageSchema.index({ assignedToId: 1 });

/**
 * Validates that mandatory stages cannot be skipped and pipelineId/assignedToId exist.
 */
HiringStageSchema.pre("save", async function (next) {
  try {
    const stage = this as Document & IHiringStage;
    if (stage.mandatory && stage.status === StageStatus.Skipped) {
      throw new Error("Mandatory stages cannot be skipped");
    }
    const [pipeline, user] = await Promise.all([
      HiringPipeline.findById(stage.pipelineId),
      stage.assignedToId
        ? User.findById(stage.assignedToId)
        : Promise.resolve(null),
    ]);
    if (!pipeline) throw new Error("Invalid pipelineId");
    if (stage.assignedToId && !user) throw new Error("Invalid assignedToId");
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error("Unknown error occurred"));
  }
});

/**
 * Deletes related StageParticipant and Interview documents on stage deletion.
 */
HiringStageSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    try {
      await Promise.all([
        StageParticipant.deleteMany({ stageId: this._id }),
        Interview.deleteMany({ stageId: this._id }),
      ]);
      next();
    } catch (error: unknown) {
      next(
        error instanceof Error ? error : new Error("Unknown error occurred")
      );
    }
  }
);

// Candidates Schema
interface ICandidate extends Document, Timestamps {
  name: string;
  email: string;
  phone?: string;
  age?: number;
  resume?: string;
  referralTokenId?: Types.ObjectId;
  highestQualification?: string;
  status: CandidateStatus;
}

/**
 * Schema for candidates with validation for phone, age, and status transitions.
 */
const CandidateSchema = new Schema<ICandidate>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: {
      type: String,
      default: undefined,
      validate: {
        validator: (value: string) =>
          !value || /^\+?[1-9]\d{1,14}$/.test(value),
        message: "Invalid phone number format",
      },
    },
    age: {
      type: Number,
      default: undefined,
      validate: {
        validator: (value: number) => !value || value > 0,
        message: "Age must be a positive number",
      },
    },
    resume: { type: String, default: undefined },
    referralTokenId: {
      type: Schema.Types.ObjectId,
      ref: "ReferralToken",
      default: undefined,
    },
    highestQualification: { type: String, default: undefined },
    status: {
      type: String,
      enum: Object.values(CandidateStatus),
      required: true,
    },
  },
  { timestamps: true }
);

CandidateSchema.index({ email: 1 }, { unique: true });
CandidateSchema.index({ referralTokenId: 1 });

/**
 * Validates referralTokenId and status transitions before saving.
 */
CandidateSchema.pre("save", async function (next) {
  try {
    const candidate = this as Document & ICandidate;
    if (candidate.referralTokenId) {
      const referral = await ReferralToken.findOne({
        _id: candidate.referralTokenId,
        expiresAt: { $gte: new Date() },
      });
      if (!referral) throw new Error("Invalid or expired referral token");
    }
    if (candidate.isModified("status")) {
      const validTransitions: Partial<
        Record<CandidateStatus, CandidateStatus[]>
      > = {
        [CandidateStatus.Applied]: [
          CandidateStatus.Shortlisted,
          CandidateStatus.Rejected,
        ],
        [CandidateStatus.Shortlisted]: [
          CandidateStatus.Interviewed,
          CandidateStatus.Rejected,
        ],
        [CandidateStatus.Interviewed]: [
          CandidateStatus.Offered,
          CandidateStatus.Rejected,
        ],
        [CandidateStatus.Offered]: [CandidateStatus.Rejected],
        [CandidateStatus.Rejected]: [],
      };
      const previousStatus = candidate.get("status", undefined, {
        getters: false,
      }) as CandidateStatus | undefined;
      if (
        previousStatus &&
        validTransitions[previousStatus] &&
        !validTransitions[previousStatus].includes(candidate.status)
      ) {
        throw new Error(
          `Invalid status transition from ${previousStatus} to ${candidate.status}`
        );
      }
    }
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error("Unknown error occurred"));
  }
});

/**
 * Deletes related documents on candidate deletion.
 */
CandidateSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    try {
      await Promise.all([
        JobApplication.deleteMany({ candidateId: this._id }),
        CandidateSkill.deleteMany({ candidateId: this._id }),
        StageParticipant.deleteMany({ candidateId: this._id }),
        Interview.deleteMany({ candidateId: this._id }),
        Note.deleteMany({ candidateId: this._id }),
        Attachment.deleteMany({ candidateId: this._id }),
      ]);
      next();
    } catch (error: unknown) {
      next(
        error instanceof Error ? error : new Error("Unknown error occurred")
      );
    }
  }
);

// Job Applications Schema
interface IJobApplication extends Document, Timestamps {
  candidateId: Types.ObjectId;
  jobId: Types.ObjectId;
  appliedAt: Date;
  source: ApplicationSource;
}

/**
 * Schema for job applications with unique candidate-job combination.
 */
const JobApplicationSchema = new Schema<IJobApplication>(
  {
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    appliedAt: { type: Date, required: true },
    source: {
      type: String,
      enum: Object.values(ApplicationSource),
      required: true,
    },
  },
  { timestamps: true }
);

JobApplicationSchema.index({ candidateId: 1, jobId: 1 }, { unique: true });

/**
 * Validates that candidateId and jobId exist and prevents duplicate applications.
 */
JobApplicationSchema.pre("save", async function (next) {
  try {
    const application = this as Document & IJobApplication;
    const [candidate, job, existing] = await Promise.all([
      Candidate.findById(application.candidateId),
      Job.findById(application.jobId),
      JobApplication.findOne({
        candidateId: application.candidateId,
        jobId: application.jobId,
      }),
    ]);
    if (!candidate) throw new Error("Invalid candidateId");
    if (!job) throw new Error("Invalid jobId");
    if (existing) throw new Error("Candidate has already applied to this job");
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error("Unknown error occurred"));
  }
});

// Referral Tokens Schema
interface IReferralToken extends Document, Timestamps {
  token: string;
  referredById: Types.ObjectId;
  jobId: Types.ObjectId;
  expiresAt: Date;
}

/**
 * Schema for referral tokens with TTL index for expiration.
 */
const ReferralTokenSchema = new Schema<IReferralToken>(
  {
    token: { type: String, required: true, unique: true },
    referredById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

ReferralTokenSchema.index({ token: 1 }, { unique: true });
ReferralTokenSchema.index({ referredById: 1 });
ReferralTokenSchema.index({ jobId: 1 });
ReferralTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Validates that referredById and jobId exist before saving.
 */
ReferralTokenSchema.pre("save", async function (next) {
  try {
    const token = this as Document & IReferralToken;
    const [user, job] = await Promise.all([
      User.findById(token.referredById),
      Job.findById(token.jobId),
    ]);
    if (!user) throw new Error("Invalid referredById");
    if (!job) throw new Error("Invalid jobId");
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error("Unknown error occurred"));
  }
});

// Candidate Skills Schema
interface ICandidateSkill extends Document, Timestamps {
  candidateId: Types.ObjectId;
  skill: string;
}

/**
 * Schema for candidate skills with unique candidate-skill combination.
 */
const CandidateSkillSchema = new Schema<ICandidateSkill>(
  {
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    skill: { type: String, required: true },
  },
  { timestamps: true }
);

CandidateSkillSchema.index({ candidateId: 1, skill: 1 }, { unique: true });

/**
 * Validates that candidateId exists before saving.
 */
CandidateSkillSchema.pre("save", async function (next) {
  try {
    const skill = this as Document & ICandidateSkill;
    const candidate = await Candidate.findById(skill.candidateId);
    if (!candidate) throw new Error("Invalid candidateId");
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error("Unknown error occurred"));
  }
});

// Stage Participants Schema
interface IStageParticipant extends Document, Timestamps {
  candidateId: Types.ObjectId;
  stageId: Types.ObjectId;
  appeared: boolean;
  qualified: boolean;
  score?: number;
  feedback?: string;
}

/**
 * Schema for stage participants with unique candidate-stage combination.
 */
const StageParticipantSchema = new Schema<IStageParticipant>(
  {
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    stageId: {
      type: Schema.Types.ObjectId,
      ref: "HiringStage",
      required: true,
    },
    appeared: { type: Boolean, required: true },
    qualified: { type: Boolean, required: true },
    score: { type: Number, default: undefined },
    feedback: { type: String, default: undefined },
  },
  { timestamps: true }
);

StageParticipantSchema.index({ candidateId: 1, stageId: 1 }, { unique: true });

/**
 * Validates that candidateId and stageId exist before saving.
 */
StageParticipantSchema.pre("save", async function (next) {
  try {
    const participant = this as Document & IStageParticipant;
    const [candidate, stage] = await Promise.all([
      Candidate.findById(participant.candidateId),
      HiringStage.findById(participant.stageId),
    ]);
    if (!candidate) throw new Error("Invalid candidateId");
    if (!stage) throw new Error("Invalid stageId");
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error("Unknown error occurred"));
  }
});

// Interview Participants Schema
interface IInterviewParticipant extends Document, Timestamps {
  interviewId: Types.ObjectId;
  interviewerId: Types.ObjectId;
}

/**
 * Schema for interview participants with unique interview-interviewer combination.
 */
const InterviewParticipantSchema = new Schema<IInterviewParticipant>(
  {
    interviewId: {
      type: Schema.Types.ObjectId,
      ref: "Interview",
      required: true,
    },
    interviewerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

InterviewParticipantSchema.index(
  { interviewId: 1, interviewerId: 1 },
  { unique: true }
);

/**
 * Validates that interviewId and interviewerId exist before saving.
 */
InterviewParticipantSchema.pre("save", async function (next) {
  try {
    const participant = this as Document & IInterviewParticipant;
    const [interview, user] = await Promise.all([
      Interview.findById(participant.interviewId),
      User.findById(participant.interviewerId),
    ]);
    if (!interview) throw new Error("Invalid interviewId");
    if (!user) throw new Error("Invalid interviewerId");
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error("Unknown error occurred"));
  }
});

/**
 * No cascading deletes needed for interview participants.
 */
InterviewParticipantSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    try {
      next();
    } catch (error: unknown) {
      next(
        error instanceof Error ? error : new Error("Unknown error occurred")
      );
    }
  }
);

// Interviews Schema
interface IInterview extends Document, Timestamps {
  candidateId: Types.ObjectId;
  stageId: Types.ObjectId;
  scheduledAt: Date;
  status: InterviewStatus;
}

/**
 * Schema for interviews with references to candidate and stage.
 */
const InterviewSchema = new Schema<IInterview>(
  {
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    stageId: {
      type: Schema.Types.ObjectId,
      ref: "HiringStage",
      required: true,
    },
    scheduledAt: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(InterviewStatus),
      required: true,
    },
  },
  { timestamps: true }
);

InterviewSchema.index({ candidateId: 1, stageId: 1 });

/**
 * Validates that candidateId and stageId exist before saving.
 */
InterviewSchema.pre("save", async function (next) {
  try {
    const interview = this as Document & IInterview;
    const [candidate, stage] = await Promise.all([
      Candidate.findById(interview.candidateId),
      HiringStage.findById(interview.stageId),
    ]);
    if (!candidate) throw new Error("Invalid candidateId");
    if (!stage) throw new Error("Invalid stageId");
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error("Unknown error occurred"));
  }
});

/**
 * Deletes related InterviewParticipant and Checklist documents on interview deletion.
 */
InterviewSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    try {
      await Promise.all([
        InterviewParticipant.deleteMany({ interviewId: this._id }),
        Checklist.deleteMany({ interviewId: this._id }),
      ]);
      next();
    } catch (error: unknown) {
      next(
        error instanceof Error ? error : new Error("Unknown error occurred")
      );
    }
  }
);

// Checklists Schema
interface IChecklist extends Document, Timestamps {
  interviewId: Types.ObjectId;
  updatedById: Types.ObjectId;
  checklist: string[];
}

/**
 * Schema for interview checklists with reference to interview and updater.
 */
const ChecklistSchema = new Schema<IChecklist>(
  {
    interviewId: {
      type: Schema.Types.ObjectId,
      ref: "Interview",
      required: true,
    },
    updatedById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    checklist: [{ type: String }],
  },
  { timestamps: true }
);

ChecklistSchema.index({ interviewId: 1 });

/**
 * Validates that interviewId and updatedById exist before saving.
 */
ChecklistSchema.pre("save", async function (next) {
  try {
    const checklist = this as Document & IChecklist;
    const [interview, user] = await Promise.all([
      Interview.findById(checklist.interviewId),
      User.findById(checklist.updatedById),
    ]);
    if (!interview) throw new Error("Invalid interviewId");
    if (!user) throw new Error("Invalid updatedById");
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error("Unknown error occurred"));
  }
});

// Notes Schema
interface INote extends Document, Timestamps {
  createdById: Types.ObjectId;
  candidateId: Types.ObjectId;
  noteType: NoteType;
  note: string;
}

/**
 * Schema for candidate notes with references to creator and candidate.
 */
const NoteSchema = new Schema<INote>(
  {
    createdById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    noteType: { type: String, enum: Object.values(NoteType), required: true },
    note: { type: String, required: true },
  },
  { timestamps: true }
);

NoteSchema.index({ candidateId: 1, createdAt: 1 });

/**
 * Validates that createdById and candidateId exist before saving.
 */
NoteSchema.pre("save", async function (next) {
  try {
    const note = this as Document & INote;
    const [user, candidate] = await Promise.all([
      User.findById(note.createdById),
      Candidate.findById(note.candidateId),
    ]);
    if (!user) throw new Error("Invalid createdById");
    if (!candidate) throw new Error("Invalid candidateId");
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error("Unknown error occurred"));
  }
});

// Attachments Schema
interface IAttachment extends Document, Timestamps {
  candidateId: Types.ObjectId;
  fileName: string;
  fileUrl: string;
  uploadedById: Types.ObjectId;
  uploadedAt: Date;
}

/**
 * Schema for candidate attachments with references to candidate and uploader.
 */
const AttachmentSchema = new Schema<IAttachment>(
  {
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    uploadedById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    uploadedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

AttachmentSchema.index({ candidateId: 1, uploadedAt: 1 });

/**
 * Validates that candidateId and uploadedById exist before saving.
 */
AttachmentSchema.pre("save", async function (next) {
  try {
    const attachment = this as Document & IAttachment;
    const [candidate, user] = await Promise.all([
      Candidate.findById(attachment.candidateId),
      User.findById(attachment.uploadedById),
    ]);
    if (!candidate) throw new Error("Invalid candidateId");
    if (!user) throw new Error("Invalid uploadedById");
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error("Unknown error occurred"));
  }
});

// Activity Logs Schema
interface IActivityLog extends Document, Timestamps {
  actorId: Types.ObjectId;
  action: Action;
  targetType: TargetType;
  targetId: Types.ObjectId;
  details?: string;
  timestamp: Date;
}

/**
 * Schema for activity logs with dynamic reference to target documents and TTL index.
 */
const ActivityLogSchema = new Schema<IActivityLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, enum: Object.values(Action), required: true },
    targetType: {
      type: String,
      enum: Object.values(TargetType),
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      refPath: "targetType",
      required: true,
    },
    details: { type: String, default: undefined },
    timestamp: { type: Date, required: true },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ actorId: 1, targetType: 1, timestamp: 1 });
ActivityLogSchema.index({ targetType: 1, targetId: 1 });
ActivityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 }); // 1-year retention

/**
 * Validates that actorId and targetId exist for the given targetType before saving.
 */
ActivityLogSchema.pre("save", async function (next) {
  try {
    const log = this as Document & IActivityLog;
    const modelMap: { [key in TargetType]?: any } = {
      [TargetType.User]: User,
      [TargetType.Candidate]: Candidate,
      [TargetType.Job]: Job,
      [TargetType.Stage]: HiringStage,
      [TargetType.Interview]: Interview,
      [TargetType.Checklist]: Checklist,
      [TargetType.Note]: Note,
      [TargetType.Attachment]: Attachment,
      [TargetType.Team]: Team,
      [TargetType.Department]: Department,
    };
    const model = modelMap[log.targetType];
    const [actor, target] = await Promise.all([
      User.findById(log.actorId),
      model ? model.findById(log.targetId) : null,
    ]);
    if (!actor) throw new Error("Invalid actorId");
    if (!model) throw new Error(`Invalid targetType ${log.targetType}`);
    if (!target)
      throw new Error(`Invalid targetId for targetType ${log.targetType}`);
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error("Unknown error occurred"));
  }
});

// Export Mongoose Models
export const Role = model<IRole>("Role", RoleSchema);
export const RolePermission = model<IRolePermission>(
  "RolePermission",
  RolePermissionSchema
);
export const User = model<IUser>("User", UserSchema);
export const Credential = model<ICredential>("Credential", CredentialSchema);
export const Team = model<ITeam>("Team", TeamSchema);
export const TeamRole = model<ITeamRole>("TeamRole", TeamRoleSchema);
export const TeamMember = model<ITeamMember>("TeamMember", TeamMemberSchema);
export const Department = model<IDepartment>("Department", DepartmentSchema);
export const Job = model<IJob>("Job", JobSchema);
export const JobSkill = model<IJobSkill>("JobSkill", JobSkillSchema);
export const HiringPipeline = model<IHiringPipeline>(
  "HiringPipeline",
  HiringPipelineSchema
);
export const HiringStage = model<IHiringStage>(
  "HiringStage",
  HiringStageSchema
);
export const Candidate = model<ICandidate>("Candidate", CandidateSchema);
export const JobApplication = model<IJobApplication>(
  "JobApplication",
  JobApplicationSchema
);
export const ReferralToken = model<IReferralToken>(
  "ReferralToken",
  ReferralTokenSchema
);
export const CandidateSkill = model<ICandidateSkill>(
  "CandidateSkill",
  CandidateSkillSchema
);
export const StageParticipant = model<IStageParticipant>(
  "StageParticipant",
  StageParticipantSchema
);
export const InterviewParticipant = model<IInterviewParticipant>(
  "InterviewParticipant",
  InterviewParticipantSchema
);
export const Interview = model<IInterview>("Interview", InterviewSchema);
export const Checklist = model<IChecklist>("Checklist", ChecklistSchema);
export const Note = model<INote>("Note", NoteSchema);
export const Attachment = model<IAttachment>("Attachment", AttachmentSchema);
export const ActivityLog = model<IActivityLog>(
  "ActivityLog",
  ActivityLogSchema
);
