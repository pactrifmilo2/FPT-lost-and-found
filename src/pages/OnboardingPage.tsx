import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  ClipboardCheck,
  MapPin,
  Search,
  ShieldCheck,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { completeOnboarding, onboardingDestination } from "@/lib/onboarding";

const steps = [
  {
    label: "Chào bạn",
    title: "Đồ thất lạc.\nKết nối lại.",
    description:
      "Một nơi để tìm đồ thất lạc, đăng đồ nhặt được và giúp những món đồ trở về đúng người.",
    points: [
      "Tìm đồ thất lạc trong khuôn viên trường",
      "Kết nối thông qua tin mất và tin nhặt được",
      "Theo dõi yêu cầu nhận lại đồ tại một nơi",
    ],
  },
  {
    label: "Đăng tin",
    title: "Một tin đăng.\nThêm cơ hội tìm lại.",
    description:
      "Bạn làm mất đồ hay vừa nhặt được một món đồ? Chọn đúng loại tin, thêm thông tin và để cộng đồng cùng giúp.",
    points: [
      "Thêm ảnh, địa điểm và thời gian gần đúng",
      "Mô tả rõ đặc điểm dễ nhận biết của món đồ",
      "Giữ kín chi tiết xác minh để đối chiếu khi nhận đồ",
    ],
  },
  {
    label: "Nhận lại đồ",
    title: "Đúng món đồ.\nĐúng chủ nhân.",
    description:
      "Thấy món đồ có thể là của mình? Gửi yêu cầu nhận lại cùng thông tin chứng minh và theo dõi phản hồi.",
    points: [
      "Gửi yêu cầu từ trang chi tiết đồ nhặt được",
      "Quản trị viên kiểm tra và duyệt yêu cầu",
      "Chỉ nhận đồ sau khi yêu cầu được chấp thuận",
    ],
  },
];

function InfoRow({
  icon: Icon,
  title,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon size={20} />
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

function Illustration({ step }: { step: number }) {
  return (
    <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
      <div className="mb-7 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-700">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
        {
          ["Kết nối trong campus", "Chia sẻ để tìm lại", "An tâm khi nhận đồ"][
            step
          ]
        }
      </div>
      {step === 0 ? (
        <>
          <div className="rounded-3xl border border-orange-100 bg-white p-7 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                Tin mất đồ
              </span>
              <span className="text-xs text-slate-500">Hòa Lạc</span>
            </div>
            <div className="my-6 flex h-28 items-center justify-center rounded-2xl bg-[#FAF9F5]">
              <img src="/brand/mark.svg" alt="" className="h-20 w-20" />
            </div>
            <p className="text-lg font-bold text-slate-900">Balo màu cam</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin size={14} /> Khu vực thư viện
            </p>
          </div>
          <div className="relative -mt-5 ml-8 flex items-center gap-3 rounded-2xl border border-orange-100 bg-white p-4 shadow-lg shadow-orange-900/5">
            <span className="rounded-full bg-emerald-50 p-2.5 text-emerald-700">
              <CheckCheck size={21} />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Mỗi kết nối, một cơ hội
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Cùng giúp đồ về đúng chủ.
              </p>
            </div>
          </div>
        </>
      ) : step === 1 ? (
        <div className="space-y-3">
          <InfoRow
            icon={Upload}
            title="Ảnh rõ ràng"
            detail="Một bức ảnh giúp mọi người dễ nhận ra món đồ."
          />
          <InfoRow
            icon={MapPin}
            title="Đúng nơi, đúng lúc"
            detail="Địa điểm và thời gian giúp thu hẹp tìm kiếm."
          />
          <InfoRow
            icon={ShieldCheck}
            title="Chi tiết xác minh riêng"
            detail="Thông tin riêng chỉ quản trị viên xem được."
          />
          <p className="px-2 pt-3 text-xs leading-relaxed text-slate-500">
            Tin đăng hiển thị ngay. Quản trị viên có thể ẩn tin không phù hợp.
          </p>
        </div>
      ) : (
        <div className="rounded-3xl border border-orange-100 bg-white p-7 shadow-sm">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <ShieldCheck size={30} />
          </div>
          <p className="text-xl font-bold text-slate-900">
            Xác minh trước khi trao
          </p>
          <div className="mt-7 space-y-6">
            {["Gửi yêu cầu", "Quản trị viên xem xét", "Duyệt và trao trả"].map(
              (label, index) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                    {index + 1}
                  </span>
                  <span className="text-sm text-slate-600">{label}</span>
                </div>
              ),
            )}
          </div>
          <p className="mt-7 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
            Theo dõi tiến trình trong mục “Yêu cầu nhận lại”.
          </p>
        </div>
      )}
      <p className="mt-7 text-center text-[10px] uppercase tracking-[0.16em] text-slate-400">
        Hình minh họa hướng dẫn
      </p>
    </div>
  );
}

export function OnboardingPage() {
  const { profile } = useAuth();
  const [step, setStep] = useState(0);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const heading = useRef<HTMLHeadingElement>(null);
  const content = steps[step];
  const destination = onboardingDestination(params.get("next"));
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  function finish(to = destination) {
    completeOnboarding(profile!.id);
    navigate(to, { replace: true });
  }
  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-800">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <img
          src="/brand/logo.svg"
          alt="Lost & Found"
          className="w-40 sm:w-60"
        />
        <button
          onClick={() => finish()}
          className="shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-white hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 sm:text-sm"
        >
          Bỏ qua hướng dẫn
        </button>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-10 sm:px-8">
        <ol
          aria-label="Các bước hướng dẫn"
          className="mb-8 mt-3 flex gap-5 border-b border-slate-200 pb-5 sm:gap-8"
        >
          {steps.map((item, index) => (
            <li
              key={item.label}
              aria-current={index === step ? "step" : undefined}
              className={`flex items-center gap-2 text-xs sm:text-sm ${index === step ? "font-semibold text-brand-700" : "text-slate-400"}`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${index <= step ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-500"}`}
              >
                {index < step ? (
                  <Check size={13} aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              {item.label}
            </li>
          ))}
        </ol>
        <div className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white md:min-h-[560px] md:grid-cols-2">
          <section className="flex flex-col justify-center px-6 py-9 sm:px-10 lg:p-14">
            <h1
              ref={heading}
              tabIndex={-1}
              className="whitespace-pre-line text-4xl font-bold leading-[1.16] tracking-tight text-[#172D3B] outline-none lg:text-5xl"
            >
              {content.title}
            </h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-slate-500">
              {content.description}
            </p>
            <ul className="mt-6 space-y-3">
              {content.points.map((point) => (
                <li
                  key={point}
                  className="flex gap-2.5 text-sm leading-6 text-slate-600"
                >
                  <Check
                    size={17}
                    className="mt-1 shrink-0 text-brand-600"
                    aria-hidden="true"
                  />
                  {point}
                </li>
              ))}
            </ul>
            {step === 2 && (
              <div className="mt-6 grid gap-2">
                {[
                  { to: "/report-lost", label: "Tôi bị mất đồ", icon: Search },
                  {
                    to: "/report-found",
                    label: "Tôi nhặt được đồ",
                    icon: ClipboardCheck,
                  },
                ].map(({ to, label, icon: Icon }) => (
                  <button
                    key={to}
                    onClick={() => finish(to)}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold hover:border-brand-300 hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
                  >
                    <Icon
                      size={18}
                      className="text-brand-600"
                      aria-hidden="true"
                    />
                    {label}
                    <ArrowRight
                      size={16}
                      className="ml-auto text-slate-400"
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            )}
            <div className="mt-9 flex items-center justify-between gap-4">
              <button
                disabled={step === 0}
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 rounded-xl px-2 py-3 text-sm font-medium text-slate-500 hover:text-slate-900 disabled:invisible"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Quay lại
              </button>
              <button
                onClick={() => (step === 2 ? finish() : setStep(step + 1))}
                className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                {step === 2 ? "Bắt đầu sử dụng" : "Tiếp tục"}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </section>
          <aside className="flex items-center bg-[#FFF4E8] px-6 py-10 sm:px-10 md:p-10">
            <Illustration step={step} />
          </aside>
        </div>
        <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
          Bạn có thể xem lại hướng dẫn bất cứ lúc nào trong mục Tài khoản.
        </p>
      </main>
    </div>
  );
}
