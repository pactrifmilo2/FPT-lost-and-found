const messages: Record<string, string> = {
  AUTH_REQUIRED: "Vui lòng xác nhận email và đăng nhập để tiếp tục.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  PROTECTED_FIELD: "Không được thay đổi thông tin được bảo vệ.",
  REPORT_LOCKED:
    "Không thể sửa tin khi đang xác minh, đã đóng hoặc đã bàn giao.",
  STALE_RECORD: "Dữ liệu đã thay đổi. Hãy tải lại trước khi tiếp tục.",
  REPORT_UNAVAILABLE: "Tin đã bị ẩn, đóng hoặc vật phẩm đã được trả.",
  INVALID_LOST_REPORT:
    "Chỉ được liên kết tin mất còn mở, hiển thị và thuộc tài khoản của bạn.",
  INVALID_IMAGE: "Ảnh không hợp lệ hoặc không thuộc quyền sử dụng của bạn.",
  INVALID_TRANSITION:
    "Trạng thái yêu cầu đã thay đổi hoặc thao tác không hợp lệ.",
  REASON_REQUIRED: "Vui lòng nhập lý do ẩn tin.",
  LAST_ADMIN: "Không thể bỏ quyền quản trị của quản trị viên cuối cùng.",
  NOT_FOUND: "Không tìm thấy dữ liệu hoặc bạn không có quyền xem.",
};
export function errorMessage(error: unknown): string {
  const e = error as {
    message?: string;
    code?: string;
    status?: number;
  } | null;
  const message = e?.message ?? "";
  for (const [code, label] of Object.entries(messages))
    if (message.includes(code)) return label;
  if (e?.code === "23505")
    return "Đã có yêu cầu đang xử lý hoặc một yêu cầu khác đã được chấp thuận.";
  if (e?.code === "23503")
    return "Dữ liệu đang được sử dụng; không thể xóa. Bạn có thể đóng hoặc ẩn tin.";
  if (
    e?.code === "42501" ||
    /row-level security|permission denied/.test(message)
  )
    return messages.FORBIDDEN;
  if (e?.code === "invalid_credentials")
    return "Email hoặc mật khẩu không đúng.";
  if (e?.code === "email_not_confirmed")
    return "Vui lòng xác nhận email trước khi đăng nhập.";
  if (e?.code === "user_already_exists")
    return "Email đã được đăng ký. Vui lòng đăng nhập hoặc khôi phục mật khẩu.";
  if (e?.code === "weak_password")
    return "Mật khẩu chưa đủ mạnh. Hãy dùng ít nhất 8 ký tự.";
  if (/rate.limit|too many/i.test(message))
    return "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.";
  if (e?.code?.startsWith("22") || e?.code === "23502" || e?.code === "23514")
    return "Thông tin chưa hợp lệ. Vui lòng kiểm tra các trường bắt buộc.";
  return "Không thể hoàn tất thao tác. Kiểm tra kết nối và thử lại.";
}
