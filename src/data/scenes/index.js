// Master Scene Data Index
import { resolveScene } from '../../utils/resolveVocab.js';
import RAW_JOB_INTERVIEW from './job_interview.json';
import RAW_OFFICE_RULES from './office_rules.json';
import RAW_OFFICE_MAIN from './office_main.json';
import RAW_OFFICE_EQUIPMENT from './office_equipment.json';
import RAW_BUSINESS_MEETING from './business_meeting.json';
import RAW_LEISURE_COMMUNITY from './leisure_community.json';
import RAW_RESTAURANT_CAFE from './restaurant_cafe.json';
import RAW_AIRPORT_TRAVEL from './airport_travel.json';
import RAW_CONFERENCE_HALL from './conference_hall.json';
import RAW_RETAIL_STORE from './retail_store.json';

export const JOB_INTERVIEW = resolveScene(RAW_JOB_INTERVIEW);
export const OFFICE_RULES = resolveScene(RAW_OFFICE_RULES);
export const OFFICE_MAIN = resolveScene(RAW_OFFICE_MAIN);
export const OFFICE_EQUIPMENT = resolveScene(RAW_OFFICE_EQUIPMENT);
export const BUSINESS_MEETING = resolveScene(RAW_BUSINESS_MEETING);
export const LEISURE_COMMUNITY = resolveScene(RAW_LEISURE_COMMUNITY);
export const RESTAURANT_CAFE = resolveScene(RAW_RESTAURANT_CAFE);
export const AIRPORT_TRAVEL = resolveScene(RAW_AIRPORT_TRAVEL);
export const CONFERENCE_HALL = resolveScene(RAW_CONFERENCE_HALL);
export const RETAIL_STORE = resolveScene(RAW_RETAIL_STORE);

export const ALL_SCENES = [
  {
    sceneId: 'job_interview',
    dayNumber: 1,
    dayTitle: 'Day 01: Tuyển dụng',
    category: 'Tuyển dụng',
    title: 'Tuyển dụng & Phỏng vấn',
    desc: 'Hồ sơ xin việc, ứng tuyển, tiêu chuẩn nhân sự và phỏng vấn công sở.',
    icon: 'Briefcase',
    accentColor: '#3b82f6',
    accentBg: 'rgba(59, 130, 246, 0.14)',
    data: JOB_INTERVIEW,
  },
  {
    sceneId: 'office_rules',
    dayNumber: 2,
    dayTitle: 'Day 02: Phép tắc - Quy định',
    category: 'Phép tắc - Quy định',
    title: 'Phép tắc & Quy định công sở',
    desc: 'Nội quy công ty, kỷ luật, quy tắc đạo đức nghề nghiệp và pháp chế tuân thủ.',
    icon: 'Landmark',
    accentColor: '#6366f1',
    accentBg: 'rgba(99, 102, 241, 0.14)',
    data: OFFICE_RULES,
  },
  {
    sceneId: 'office_main',
    dayNumber: 3,
    dayTitle: 'Day 03: Công việc văn phòng (1)',
    category: 'Công việc văn phòng (1)',
    title: 'Tác vụ văn phòng & Bàn làm việc',
    desc: 'Tác vụ văn phòng, quản lý hồ sơ, công văn thư tín và giao tiếp đồng nghiệp.',
    icon: 'BookText',
    accentColor: '#8b5cf6',
    accentBg: 'rgba(139, 92, 246, 0.14)',
    data: OFFICE_MAIN,
  },
  {
    sceneId: 'office_equipment',
    dayNumber: 4,
    dayTitle: 'Day 04: Công việc văn phòng (2)',
    category: 'Công việc văn phòng (2)',
    title: 'Thiết bị công nghệ & In ấn',
    desc: 'Thiết bị văn phòng, xử lý tài liệu, công việc thường nhật và phân công nhiệm vụ.',
    icon: 'Cpu',
    accentColor: '#a855f7',
    accentBg: 'rgba(168, 85, 247, 0.14)',
    data: OFFICE_EQUIPMENT,
  },
  {
    sceneId: 'business_meeting',
    dayNumber: 5,
    dayTitle: 'Day 05: Công việc văn phòng (3)',
    category: 'Công việc văn phòng (3)',
    title: 'Họp chiến lược & Thuyết trình',
    desc: 'Báo cáo công tác, điều phối phòng ban, deadline và tiến độ dự án nội bộ.',
    icon: 'Users',
    accentColor: '#d946ef',
    accentBg: 'rgba(217, 70, 239, 0.14)',
    data: BUSINESS_MEETING,
  },
  {
    sceneId: 'leisure_community',
    dayNumber: 6,
    dayTitle: 'Day 06: Thời gian rảnh - Cộng đồng',
    category: 'Thời gian rảnh - Cộng đồng',
    title: 'Thời gian rảnh & Cộng đồng',
    desc: 'Hoạt động giải trí sau giờ làm, giao lưu cộng đồng, sự kiện thiện nguyện.',
    icon: 'Sparkles',
    accentColor: '#ec4899',
    accentBg: 'rgba(236, 72, 153, 0.14)',
    data: LEISURE_COMMUNITY,
  },
  {
    sceneId: 'restaurant_cafe',
    dayNumber: 7,
    dayTitle: 'Day 07: Nhà hàng & Ẩm thực',
    category: 'Nhà hàng & Dịch vụ',
    title: 'Nhà hàng & Dịch vụ ẩm thực',
    desc: 'Phục vụ ăn uống, tiếp đón thực khách, đặt bàn tiệc và thực đơn ẩm thực.',
    icon: 'UtensilsCrossed',
    accentColor: '#14b8a6',
    accentBg: 'rgba(20, 184, 166, 0.14)',
    data: RESTAURANT_CAFE,
  },
  {
    sceneId: 'airport_travel',
    dayNumber: 8,
    dayTitle: 'Day 08: Sân bay & Đi lại',
    category: 'Sân bay & Du lịch',
    title: 'Sân bay & Di chuyển quốc tế',
    desc: 'Thủ tục lên máy bay, hành lý ký gửi, ga hành khách và di chuyển quốc tế.',
    icon: 'Plane',
    accentColor: '#0ea5e9',
    accentBg: 'rgba(14, 165, 233, 0.14)',
    data: AIRPORT_TRAVEL,
  },
  {
    sceneId: 'conference_hall',
    dayNumber: 9,
    dayTitle: 'Day 09: Hội nghị & Thuyết trình',
    category: 'Hội nghị & Sự kiện',
    title: 'Hội nghị & Thuyết trình diễn giả',
    desc: 'Hội thảo doanh nghiệp, bục diễn giả, slide trình chiếu và khán phòng.',
    icon: 'TrendingUp',
    accentColor: '#f59e0b',
    accentBg: 'rgba(245, 158, 11, 0.14)',
    data: CONFERENCE_HALL,
  },
  {
    sceneId: 'retail_store',
    dayNumber: 10,
    dayTitle: 'Day 10: Mua sắm & Siêu thị',
    category: 'Mua sắm & Siêu thị',
    title: 'Mua sắm bán lẻ & Siêu thị',
    desc: 'Xe đẩy siêu thị, quét mã vạch, quầy thanh toán và trưng bày hàng hóa.',
    icon: 'ShoppingBag',
    accentColor: '#ef4444',
    accentBg: 'rgba(239, 68, 68, 0.14)',
    data: RETAIL_STORE,
  },
];
