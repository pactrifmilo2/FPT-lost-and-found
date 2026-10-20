/**
 * Vietnamese user-facing text for the whole app.
 *
 * Domain values (roles, statuses, report kinds, category/location ids) stay in
 * English as stable data values; only the strings shown to people live here.
 */

import type { MatchReason } from '@/types';

export const LOCALE = 'vi-VN';

/** Short label for a report kind, used in chips and badges. */
export const KIND_LABEL = {
  lost: 'Tin mất đồ',
  found: 'Tin nhặt được',
} as const;

/** Longer noun for prose, e.g. "Mở tin mất đồ". */
export const KIND_NOUN = {
  lost: 'tin mất đồ',
  found: 'tin nhặt được',
} as const;

export const ROLE_LABEL = {
  member: 'Thành viên',
  admin: 'Quản trị',
} as const;

export const COMMON = {
  cancel: 'Huỷ',
  save: 'Lưu',
  close: 'Đóng',
  back: 'Quay lại',
  optional: 'Không bắt buộc',
  processing: 'Đang xử lý…',
  remove: 'Xoá',
  replace: 'Thay ảnh',
  all: 'Tất cả',
  none: 'Không có',
  building: 'Toà nhà',
  area: 'Khu vực',
} as const;

export const NAV = {
  home: 'Trang chủ',
  browse: 'Xem đồ thất lạc',
  reportLost: 'Báo mất đồ',
  reportFound: 'Báo nhặt được',
  myReports: 'Tin của tôi',
  claims: 'Yêu cầu nhận lại',
  admin: 'Quản trị',
} as const;

export const HEADER = {
  toggleMenu: 'Mở / đóng menu',
} as const;

export const FOOTER = {
  note:
    'FPT Lost & Found · Kết nối cộng đồng FPT Campus. Yêu cầu nhận đồ được quản trị viên xác minh trước khi bàn giao.',
} as const;

export const STATUS_LABEL = {
  LOST: 'Đang tìm',
  AVAILABLE: 'Chưa có người nhận',
  POSSIBLE_MATCH: 'Có thể trùng khớp',
  CLAIM_IN_PROGRESS: 'Đang xác minh',
  RETURNED: 'Đã trả lại',
  CLOSED: 'Đã đóng',
  PENDING: 'Chờ xử lý',
  UNDER_REVIEW: 'Đang xem xét',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  COMPLETED: 'Hoàn tất',
} as const;

export const UNKNOWN_STATUS = 'Không rõ';

export const MATCH_REASON = {
  sameCategory: () => 'Cùng danh mục',
  nearlyIdenticalName: () => 'Tên gần như giống hệt',
  similarName: () => 'Tên đồ vật tương tự',
  sameDay: () => 'Được báo trong cùng ngày',
  oneDayAfter: () => 'Được nhặt 1 ngày sau khi báo mất',
  daysAfter: (p: { days: number }) => `Được nhặt ${p.days} ngày sau khi báo mất`,
  sameLocation: () => 'Cùng địa điểm',
  sameBuilding: () => 'Cùng toà nhà',
  similarDescription: () => 'Mô tả tương tự',
} as const;

/** Render a matcher reason (key + optional params) as Vietnamese prose. */
export function formatMatchReason(reason: MatchReason): string {
  switch (reason.key) {
    case 'daysAfter':
      return MATCH_REASON.daysAfter({ days: reason.params?.days ?? 0 });
    default:
      return MATCH_REASON[reason.key]();
  }
}

export const HOME = {
  badge: 'Đồ thất lạc FPT Campus',
  title: 'Bạn làm mất đồ trên campus? Chúng tôi giúp bạn tìm lại.',
  subtitle:
    'Báo mất đồ, tiếp nhận đồ nhặt được, và để hệ thống ghép nối giúp chủ nhân nhận lại đồ của mình — tất cả trong một nơi.',
  searchPlaceholder: 'Tìm đồ vật, ví dụ: AirPods, ví…',
  search: 'Tìm kiếm',
  reportLost: 'Báo mất đồ',
  reportFound: 'Báo nhặt được',
  stats: {
    lost: 'Tin mất đồ',
    found: 'Đồ nhặt được',
    matches: 'Có thể trùng khớp',
    returned: 'Đã trả lại',
  },
  howItWorks: 'Cách hoạt động',
  step1Title: '1 · Đăng tin',
  step1Text:
    'Báo mất một món đồ hoặc tiếp nhận món đồ bạn nhặt được, kèm ảnh và các đặc điểm nhận dạng.',
  step2Title: '2 · Ghép nối',
  step2Text:
    'Hệ thống so khớp theo danh mục, tên, ngày, địa điểm và mô tả để tìm ra các trường hợp có thể trùng khớp.',
  step3Title: '3 · Xác minh & trao trả',
  step3Text:
    'Gửi yêu cầu nhận lại, xác minh quyền sở hữu bằng thông tin riêng, rồi nhận lại đồ.',
  latest: 'Tin mới nhất',
  viewAll: 'Xem tất cả',
} as const;

export const BROWSE = {
  title: 'Đồ thất lạc',
  subtitle: 'Tìm kiếm và lọc toàn bộ tin mất đồ và nhặt được trong campus.',
  resultCount: (n: number) => `${n} kết quả`,
  keywordPlaceholder: 'Tìm theo từ khoá…',
  clear: 'Xoá lọc',
  category: 'Danh mục',
  allCategories: 'Tất cả danh mục',
  location: 'Địa điểm',
  allLocations: 'Tất cả địa điểm',
  building: 'Toà nhà',
  allBuildings: 'Tất cả toà nhà',
  status: 'Trạng thái',
  allStatuses: 'Tất cả trạng thái',
  from: 'Từ ngày',
  to: 'Đến ngày',
  emptyTitle: 'Không tìm thấy đồ vật nào',
  emptyDescription: 'Hãy thử điều chỉnh bộ lọc hoặc từ khoá tìm kiếm.',
  clearAll: 'Xoá toàn bộ bộ lọc',
} as const;

export const CARD = {
  matchPercent: (n: number) => `Trùng khớp ${n}%`,
} as const;

export const REPORT_FORM = {
  lostPageTitle: 'Báo mất đồ',
  lostPageSubtitle:
    'Cho chúng tôi biết bạn mất gì và ở đâu — hệ thống sẽ tự động tìm các trường hợp có thể trùng khớp.',
  foundPageTitle: 'Báo nhặt được đồ',
  foundPageSubtitle:
    'Bạn nhặt được đồ trong campus? Hãy tiếp nhận để chủ sở hữu có thể tìm lại.',
  itemDetails: 'Thông tin đồ vật',
  itemDetailsHint: 'Mô tả món đồ để người khác có thể nhận ra.',
  itemName: 'Tên đồ vật',
  itemNamePlaceholder: 'ví dụ: AirPods Pro màu đen (gen 2)',
  itemNameRequired: 'Vui lòng đặt tên cho đồ vật.',
  category: 'Danh mục',
  categoryRequired: 'Hãy chọn một danh mục.',
  selectCategory: 'Chọn danh mục…',
  description: 'Mô tả',
  descriptionRequired: 'Hãy thêm mô tả ngắn.',
  descriptionHintLost: 'Hình dáng ra sao, mất ở đâu, có gì đáng chú ý.',
  descriptionHintFound: 'Mô tả công khai — thông tin riêng ghi ở phần bên dưới.',
  descriptionPlaceholder: 'Mô tả đồ vật…',
  dateLost: 'Ngày mất',
  dateFound: 'Ngày nhặt được',
  dateRequired: 'Hãy chọn một ngày.',
  time: 'Thời gian (khoảng)',
  campusLocation: 'Địa điểm trong campus',
  locationRequired: 'Hãy chọn một địa điểm trong campus.',
  selectLocation: 'Chọn địa điểm…',
  building: 'Toà nhà',
  selectBuilding: 'Chọn toà nhà…',
  floorRoomLost: 'Tầng / phòng / vị trí cụ thể',
  floorRoomFound: 'Vị trí cụ thể',
  floorRoomHint: 'Không bắt buộc — ví dụ: khu đọc sách tầng 3',
  floorRoomPlaceholder: 'ví dụ: Phòng 305, giảng đường A102',
  photo: 'Ảnh',
  photoHint: 'Không bắt buộc — JPEG, PNG hoặc WebP, tối đa 5 MB.',
  readImageError: 'Không đọc được ảnh.',
  uploadPhoto: 'Tải ảnh lên',
  ownership: 'Thông tin quyền sở hữu',
  ownershipHint: 'Thông tin này lưu trong tin đăng và giúp xác nhận đồ vật đúng là của bạn.',
  distinguishing: 'Đặc điểm nhận dạng',
  distinguishingRequired: 'Hãy mô tả điểm giúp nhận ra món đồ — điều này giúp chứng minh quyền sở hữu.',
  distinguishingHint: 'Vết tích ẩn, chữ khắc, sticker — bất cứ chi tiết nào chỉ chủ sở hữu biết.',
  distinguishingPlaceholder: 'ví dụ: Chữ khắc tên viết tắt trên hộp…',
  contact: 'Cách liên hệ mong muốn',
  contactRequired: 'Chúng tôi nên liên hệ với bạn bằng cách nào?',
  contactHint: 'Chúng tôi nên liên hệ với bạn thế nào nếu có kết quả trùng khớp?',
  contactPlaceholder: 'ví dụ: Email: ban@fpt.edu.vn hoặc 09xx xxx xxx',
  foundDetails: 'Thông tin đồ nhặt được',
  foundDetailsHint: 'Hiện món đồ đang ở đâu, và chủ sở hữu chứng minh thế nào?',
  currentHolder: 'Người đang giữ',
  privateInfo: 'Thông tin xác minh riêng tư',
  privateInfoRequired: 'Hãy thêm một chi tiết riêng mà chỉ chủ sở hữu thật sự mới biết.',
  privateInfoHint: 'Một chi tiết ẩn chỉ chủ sở hữu thật sự biết — thông tin này KHÔNG BAO GIỜ hiển thị công khai.',
  privateInfoNote: 'Chỉ quản trị viên được đọc thông tin này để đối chiếu yêu cầu nhận đồ. Không đưa thông tin bí mật vào mô tả hoặc ảnh công khai.',
  privateInfoPlaceholder: "ví dụ: Chữ khắc viết tắt 'MT' trên hộp…",
  submittingAs: 'Đang gửi với tên',
  campusFallback: 'campus',
  submitLost: 'Gửi tin mất đồ',
  submitFound: 'Gửi tin nhặt được',
} as const;

export const DETAIL = {
  notFoundTitle: 'Không tìm thấy đồ vật',
  notFoundDescription: 'Tin đăng này có thể đã bị xoá.',
  backToBrowse: 'Về trang xem đồ',
  changePhoto: 'Đổi ảnh',
  createdTitle: 'Đã gửi tin đăng.',
  createdBody: 'Hệ thống đã tự động kiểm tra các trường hợp có thể trùng khớp — xem kết quả bên dưới.',
  lostOn: 'Mất ngày',
  foundOn: 'Nhặt được ngày',
  timeAround: (t: string) => `Khoảng ${t}`,
  timeUnknown: 'Không rõ thời gian',
  description: 'Mô tả',
  distinguishing: 'Đặc điểm nhận dạng',
  reportedBy: 'Người báo tin',
  currentHolder: 'Người đang giữ',
  registeredBy: 'Người tiếp nhận',
  privateInfo: 'Thông tin xác minh riêng tư',
  possibleMatches: 'Có thể trùng khớp',
  noMatches:
    'Chưa có trường hợp trùng khớp nào. Kết quả sẽ tự động xuất hiện khi có tin đăng với danh mục, tên, ngày, địa điểm hoặc mô tả tương tự.',
  openReport: (kindKey: 'lost' | 'found') => `Mở ${KIND_NOUN[kindKey]}`,
  claimedTitle: 'Bạn đã gửi yêu cầu nhận lại đồ này',
  statusPrefix: 'Trạng thái:',
  trackClaim: 'Theo dõi yêu cầu của tôi',
  isThisYours: 'Đây có phải đồ của bạn?',
  isThisYoursBody:
    'Nếu bạn cho rằng món đồ nhặt được này là của mình, hãy gửi yêu cầu nhận lại và chúng tôi sẽ xác minh quyền sở hữu.',
  claimButton: 'Đây có thể là đồ của tôi',
  alreadyReturned: 'Món đồ này đã được trao trả.',
  claimsOnItem: 'Yêu cầu nhận lại cho món đồ này',
  noClaims: 'Chưa có yêu cầu nhận lại nào.',
  manageClaims: 'Quản lý yêu cầu',
  lostSomething: 'Bạn làm mất đồ?',
  matchesFound: (n: number) =>
    `Chúng tôi tìm thấy ${n} trường hợp có thể trùng khớp cho tin này — mở kết quả để gửi yêu cầu nhận lại.`,
  noMatchesYet: 'Khi có người tiếp nhận món đồ trùng khớp, kết quả sẽ tự động hiện ở đây.',
  tipLabel: 'Mẹo:',
  tipBody:
    'các tin đăng trùng theo danh mục, tên, ngày, địa điểm và mô tả sẽ được tính điểm tự động — không cần AI.',
} as const;

export const CLAIM_MODAL = {
  title: (itemName: string) => `Yêu cầu nhận lại "${itemName}"`,
  intro:
    'Hãy cho chúng tôi biết vì sao món đồ này là của bạn. Chi tiết càng cụ thể, yêu cầu càng được xác minh nhanh.',
  yourName: 'Tên của bạn',
  nameRequired: 'Vui lòng nhập tên của bạn.',
  contact: 'Liên hệ / cách thức mong muốn',
  contactRequired: 'Chúng tôi nên liên hệ với bạn bằng cách nào?',
  contactPlaceholder: 'Email hoặc số điện thoại',
  whyYours: 'Vì sao đây là đồ của bạn?',
  whyRequired: 'Hãy giải thích vì sao món đồ này là của bạn.',
  whyHint: 'Bạn mất khi nào và ở đâu? Món đồ trông thế nào?',
  distinguishing: 'Đặc điểm ẩn / nhận dạng',
  distinguishingRequired: 'Hãy cung cấp một chi tiết ẩn để chứng minh quyền sở hữu.',
  distinguishingHint: 'Một chi tiết chỉ chủ sở hữu thật sự biết (chữ khắc, số sê-ri, sticker…).',
  proof: 'Bằng chứng sở hữu',
  proofHint: 'Không bắt buộc — hoá đơn, ảnh, lịch sử kết nối…',
  proofPlaceholder: 'Mô tả hoặc dán bằng chứng…',
  linkLost: 'Liên kết tới tin mất đồ của bạn',
  linkLostHint: 'Không bắt buộc — gắn yêu cầu này với một tin mất đồ bạn đã đăng.',
  submit: 'Gửi yêu cầu',
} as const;

export const EDIT_PHOTO = {
  title: (itemName: string) => `Đổi ảnh — ${itemName}`,
  readError: 'Không đọc được ảnh đó.',
  save: 'Lưu ảnh',
  upload: 'Tải ảnh mới',
  note: 'Xoá ảnh sẽ khôi phục lại ảnh minh hoạ mặc định của danh mục.',
} as const;

export const MY_REPORTS = {
  title: 'Tin đăng & yêu cầu của tôi',
  subtitle: 'Theo dõi mọi tin bạn đã đăng và mọi yêu cầu nhận lại bạn đã gửi.',
  claimSubmittedTitle: 'Đã gửi yêu cầu nhận lại.',
  claimSubmittedBody: 'Chúng tôi sẽ xem xét yêu cầu của bạn và liên hệ nếu cần thêm bằng chứng.',
  myClaims: 'Yêu cầu nhận lại của tôi',
  noClaims: 'Chưa có yêu cầu nào',
  noClaimsDescription:
    'Khi bạn thấy một món đồ nhặt được có thể là của mình, hãy mở tin đó và bấm “Đây có thể là đồ của tôi”.',
  browseItems: 'Xem đồ thất lạc',
  itemRemoved: 'Đồ vật đã bị xoá',
  filed: (when: string) => `Gửi ${when}`,
  myLost: 'Tin mất đồ của tôi',
  myFound: 'Tin nhặt được của tôi',
  nothingReported: 'Chưa có tin đăng nào',
  noLostDescription: 'Hãy báo mất một món đồ để hệ thống tự động đối chiếu với đồ nhặt được.',
  noFoundDescription: 'Bạn nhặt được đồ trong campus? Hãy tiếp nhận để chủ sở hữu có thể tìm thấy.',
  reportLost: 'Báo mất đồ',
  reportFound: 'Báo nhặt được',
} as const;

export const CLAIMS_PAGE = {
  title: 'Duyệt yêu cầu nhận lại',
  subtitle:
    'Đối chiếu quyền sở hữu với thông tin riêng tư của từng món đồ, sau đó duyệt và hoàn tất việc trao trả.',
  emptyTitle: 'Không có yêu cầu nào',
  emptyDescription: 'Yêu cầu sẽ xuất hiện khi sinh viên cho rằng một món đồ nhặt được là của mình.',
  itemRemoved: 'Đồ vật đã bị xoá',
  claimBy: 'Yêu cầu của',
  heldBy: (holder: string) => `đang giữ bởi ${holder}`,
  explanation: 'Giải trình',
  claimantDetails: 'Đặc điểm nhận dạng do người yêu cầu cung cấp',
  proof: 'Bằng chứng sở hữu',
  contact: 'Liên hệ',
  privateInfo: 'Thông tin xác minh riêng tư',
  linkedLost: 'Tin mất đồ liên kết',
  startReview: 'Bắt đầu xem xét',
  reject: 'Từ chối',
  approve: 'Duyệt quyền sở hữu',
  confirmHandover: 'Xác nhận đã trao trả',
  reopen: 'Mở lại',
  completed: 'Đã trao trả đồ cho chủ sở hữu.',
} as const;

export const ADMIN = {
  title: 'Trang quản trị',
  subtitle: 'Kiểm duyệt tin đăng, quản lý yêu cầu nhận lại, danh mục, địa điểm và xem thống kê.',
  reset: 'Khôi phục dữ liệu demo',
  resetConfirm: 'Khôi phục toàn bộ dữ liệu về bộ dữ liệu demo ban đầu?',
  tabs: {
    overview: 'Tổng quan',
    reports: 'Tin đăng',
    categories: 'Danh mục',
    locations: 'Địa điểm',
  },
  stats: {
    lost: 'Tin mất đồ',
    found: 'Đồ nhặt được',
    matches: 'Có thể trùng khớp',
    activeClaims: 'Yêu cầu đang xử lý',
    returned: 'Đã trả lại',
    total: 'Tổng số đồ vật',
  },
  claims: 'Yêu cầu nhận lại',
  reviewClaims: 'Duyệt yêu cầu →',
  byCategory: 'Tin đăng theo danh mục',
  byLocation: 'Tin đăng theo địa điểm',
  counts: (categories: number, locations: number) =>
    `Danh mục: ${categories} · Địa điểm: ${locations}`,
  table: {
    item: 'Đồ vật',
    category: 'Danh mục',
    location: 'Địa điểm',
    status: 'Trạng thái',
    reporter: 'Người đăng',
    actions: 'Thao tác',
  },
  reopenReport: 'Mở lại tin đăng',
  closeReport: 'Đóng tin đăng',
  deleteReport: 'Xoá tin đăng',
  deleteReportConfirm: (itemName: string) => `Xoá "${itemName}"? Không thể hoàn tác.`,
  addCategory: 'Thêm danh mục',
  editCategory: 'Sửa danh mục',
  categoryInUse: 'Danh mục này đang được dùng bởi các tin đăng hiện có — hãy chuyển chúng sang danh mục khác trước.',
  deleteCategoryConfirm: (name: string) => `Xoá danh mục "${name}"?`,
  addLocation: 'Thêm địa điểm',
  editLocation: 'Sửa địa điểm',
  locationInUse: 'Địa điểm này đang được dùng bởi các tin đăng hiện có — hãy chuyển chúng sang địa điểm khác trước.',
  deleteLocationConfirm: (name: string) => `Xoá địa điểm "${name}"?`,
  name: 'Tên',
  emoji: 'Biểu tượng',
  color: 'Màu',
  type: 'Loại',
  namePlaceholderCategory: 'ví dụ: Dụng cụ thể thao',
  namePlaceholderLocation: 'ví dụ: Nhà thi đấu',
  reportCount: (n: number) => `${n} tin đăng`,
} as const;
