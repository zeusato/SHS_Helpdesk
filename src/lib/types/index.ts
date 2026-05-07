export type UserRole = 'manager' | 'po'
export type UserStatus = 'active' | 'inactive'
export type ProjectStatus = 'active' | 'inactive'
export type TicketPriority = 'low' | 'medium' | 'high'
export type TicketStatus = 'new' | 'in_progress' | 'pending_customer' | 'resolved' | 'closed'
export type ShapeUpStatus = 'draft' | 'review' | 'published'

export interface Project {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  created_at: string
}

export interface User {
  id: string
  username: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  created_at: string
}

export interface ProjectPO {
  id: string
  project_id: string
  user_id: string
  created_at: string
  // Joined fields
  user?: User
  project?: Project
}

export interface Ticket {
  id: string
  project_id: string
  title: string
  issue_detail: string | null
  priority: TicketPriority
  status: TicketStatus
  requester_name: string
  requester_department: string | null
  requester_email: string
  attachments: string[]
  images: string[]
  assignee_id: string | null
  note: string | null
  reply_date: string | null
  created_at: string
  updated_at: string
  // Joined fields
  project?: Project
  assignee?: User
}

export interface ShapeUp {
  id: string
  project_id: string
  title: string
  issue_detail: string | null
  solution: string | null
  document_link: string | null
  jira_link: string | null
  note: string | null
  status: ShapeUpStatus
  created_by: string
  source_ticket_id: string | null
  images: string[]
  done_date: string | null
  created_at: string
  updated_at: string
  // Joined fields
  project?: Project
  creator?: User
}

export interface Email {
  id: string
  ticket_id: string
  sender_id: string
  subject: string
  content: string
  sent_date: string
  // Joined
  sender?: User
}

export interface TicketShapeUp {
  ticket_id: string
  shapeup_id: string
  linked_by_user: string
  linked_date: string
  // Joined
  shapeup?: ShapeUp
  ticket?: Ticket
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string | null
  link: string | null
  is_read: boolean
  created_at: string
}
