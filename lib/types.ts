export type UserRole = "user" | "admin";
export type ListingStatus =
  | "available"
  | "reserved"
  | "at_church"
  | "sold"
  | "cancelled";
export type PickupMethod = "church" | "seller_location";
export type OrderStatus =
  | "reserved"
  | "awaiting_dropoff"
  | "ready_for_pickup"
  | "completed"
  | "cancelled";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  nickname: string | null;
  phone: string | null;
  kakao_id: string | null;
  role: UserRole;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
};

export type PublicSeller = {
  nickname: string | null;
  full_name: string | null;
  email: string | null;
  is_anonymous: boolean;
};

export type Category = {
  id: string;
  slug: string;
  name_ko: string;
  sort_order: number;
};

export type Listing = {
  id: string;
  seller_id: string;
  category_id: string;
  title: string;
  description: string;
  price_cents: number;
  status: ListingStatus;
  pickup_method?: PickupMethod;
  cover_image_path: string | null;
  created_at: string;
  updated_at: string;
  categories?: Category | null;
  listing_images?: ListingImage[];
  seller?: PublicSeller | PublicSeller[] | null;
};

export type ListingImage = {
  id: string;
  listing_id: string;
  storage_path: string;
  sort_order: number;
};

export type Order = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  status: OrderStatus;
  price_cents: number;
  reserved_at: string;
  dropoff_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  listings?: Listing | null;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type AdminStats = {
  range: string;
  new_listings: number;
  reserved: number;
  at_church: number;
  sold: number;
  gmv_cents: number;
  active_users: number;
  orders_awaiting_dropoff: number;
  orders_ready_for_pickup: number;
};

export type StatsRange = "day" | "week" | "month" | "year" | "all";

export type ComplaintStatus = "open" | "resolved";

export type Complaint = {
  id: string;
  user_id: string;
  subject: string;
  body: string;
  status: ComplaintStatus;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
};
