import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scenesDir = path.resolve(__dirname, '../src/data/scenes');

if (!fs.existsSync(scenesDir)) {
  fs.mkdirSync(scenesDir, { recursive: true });
}

// 1. Update office_main.json with day metadata
const officeMainPath = path.join(scenesDir, 'office_main.json');
if (fs.existsSync(officeMainPath)) {
  const officeMain = JSON.parse(fs.readFileSync(officeMainPath, 'utf-8'));
  officeMain.dayNumber = 3;
  officeMain.dayTitle = "Day 03: Công việc văn phòng (1)";
  officeMain.category = "Công việc văn phòng (1)";
  fs.writeFileSync(officeMainPath, JSON.stringify(officeMain, null, 2), 'utf-8');
}

// 2. Update restaurant_cafe.json with day metadata
const restaurantPath = path.join(scenesDir, 'restaurant_cafe.json');
if (fs.existsSync(restaurantPath)) {
  const rest = JSON.parse(fs.readFileSync(restaurantPath, 'utf-8'));
  rest.dayNumber = 7;
  rest.dayTitle = "Day 07: Nhà hàng & Ẩm thực";
  rest.category = "Nhà hàng & Dịch vụ";
  fs.writeFileSync(restaurantPath, JSON.stringify(rest, null, 2), 'utf-8');
}

// 3. Define office_rules.json (Day 02)
const officeRules = {
  sceneId: "office_rules",
  dayNumber: 2,
  dayTitle: "Day 02: Phép tắc - Quy định",
  category: "Phép tắc - Quy định",
  title: "Phép tắc & Quy định công sở",
  topic: "Company Rules & Compliance",
  description: "Nội quy công ty, kỷ luật, quy tắc đạo đức nghề nghiệp và kiểm soát an ninh ra vào tòa nhà.",
  image: "/scenes/office_rules.jpg",
  canvasWidth: 1000,
  canvasHeight: 562.5,
  fullViewBox: "0 0 1000 562.5",
  zones: [
    {
      zoneId: "zone_turnstiles",
      order: 1,
      label: "Cổng an ninh & Quẹt thẻ",
      labelEn: "Security Turnstiles",
      viewBox: "440 240 540 320",
      center: { x: 0.70, y: 0.65 },
      items: [
        {
          id: "or_turnstile",
          word: "turnstile gate",
          ipa: "/ˈtɜːrnstaɪl ɡeɪt/",
          meaningVi: "cổng xoay an ninh tự động",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.55, y: 0.70 },
          example: "Employees pass through the electronic turnstile gates each morning.",
          collocation: "pass through a turnstile"
        },
        {
          id: "or_reader",
          word: "card reader",
          ipa: "/kɑːrd ˈriːdər/",
          meaningVi: "máy đọc thẻ từ cảm ứng",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.60, y: 0.60 },
          example: "Tap your electronic badge against the card reader to enter.",
          collocation: "tap the card reader"
        },
        {
          id: "or_id_badge",
          word: "ID badge",
          ipa: "/ˌaɪ ˈdiː bædʒ/",
          meaningVi: "thẻ nhân viên nhận diện",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.70, y: 0.58 },
          example: "Security requires all staff to wear their ID badges at all times.",
          collocation: "display an ID badge"
        },
        {
          id: "or_lanyard",
          word: "lanyard",
          ipa: "/ˈlænjərd/",
          meaningVi: "dây đeo thẻ cổ",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.53, y: 0.50 },
          example: "He wore his visitor pass on a navy blue lanyard.",
          collocation: "wear a lanyard"
        },
        {
          id: "or_swipe",
          word: "swipe a badge",
          ipa: "/swaɪp ə bædʒ/",
          meaningVi: "quẹt thẻ an ninh",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.63, y: 0.58 },
          example: "She swiped her security badge to unlock the glass barrier.",
          collocation: "swipe a badge"
        }
      ]
    },
    {
      zoneId: "zone_reception",
      order: 2,
      label: "Bàn tiếp tân & Tiếp đón",
      labelEn: "Reception Desk",
      viewBox: "20 200 450 350",
      center: { x: 0.22, y: 0.65 },
      items: [
        {
          id: "or_reception_desk",
          word: "reception desk",
          ipa: "/rɪˈsepʃn desk/",
          meaningVi: "quầy lễ tân tiền sảnh",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.20, y: 0.65 },
          example: "Guests should register at the front reception desk upon arrival.",
          collocation: "at the reception desk"
        },
        {
          id: "or_receptionist",
          word: "receptionist",
          ipa: "/rɪˈsepʃənɪst/",
          meaningVi: "nhân viên lễ tân",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.13, y: 0.52 },
          example: "The friendly receptionist greeted visitors and checked their IDs.",
          collocation: "greet the receptionist"
        },
        {
          id: "or_visitor_log",
          word: "visitor log",
          ipa: "/ˈvɪzɪtər lɔːɡ/",
          meaningVi: "sổ đăng ký khách ra vào",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.22, y: 0.54 },
          example: "Please write your name and company in the visitor log.",
          collocation: "sign the visitor log"
        },
        {
          id: "or_countertop",
          word: "marble counter",
          ipa: "/ˈmɑːrbl ˈkaʊntər/",
          meaningVi: "mặt bàn đá cẩm thạch",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.12, y: 0.66 },
          example: "Brochures and maps were arranged on the marble counter.",
          collocation: "on the counter"
        },
        {
          id: "or_issue_pass",
          word: "issue a visitor pass",
          ipa: "/ˈɪʃuː ə ˈvɪzɪtər pæs/",
          meaningVi: "cấp thẻ ra vào cho khách",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.20, y: 0.48 },
          example: "The front desk staff issued a temporary visitor pass.",
          collocation: "issue a pass"
        }
      ]
    },
    {
      zoneId: "zone_security_monitors",
      order: 3,
      label: "Giám sát & Camera an ninh",
      labelEn: "Security & Surveillance",
      viewBox: "0 0 450 300",
      center: { x: 0.25, y: 0.25 },
      items: [
        {
          id: "or_camera",
          word: "surveillance camera",
          ipa: "/sɜːrˈveɪləns ˈkæmrə/",
          meaningVi: "camera giám sát an ninh",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.38, y: 0.15 },
          example: "CCTV surveillance cameras monitor all building entry points 24/7.",
          collocation: "install a camera"
        },
        {
          id: "or_company_logo",
          word: "corporate emblem",
          ipa: "/ˈkɔːrpərət ˈembləm/",
          meaningVi: "biểu trưng thương hiệu công ty",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.04, y: 0.30 },
          example: "The corporate emblem is carved into the granite wall.",
          collocation: "display the emblem"
        },
        {
          id: "or_notice",
          word: "security policy",
          ipa: "/sɪˈkjʊrəti ˈpɑːləsi/",
          meaningVi: "chính sách an toàn bảo mật",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.27, y: 0.47 },
          example: "Employees are trained to comply with the company security policy.",
          collocation: "follow security policy"
        },
        {
          id: "or_ceiling_lights",
          word: "recessed lighting",
          ipa: "/rɪˈsest ˈlaɪtɪŋ/",
          meaningVi: "hệ thống đèn âm trần",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.38, y: 0.06 },
          example: "The modern high ceiling features recessed LED lighting fixtures.",
          collocation: "bright lighting"
        },
        {
          id: "or_comply",
          word: "comply with regulations",
          ipa: "/kəmˈplaɪ wɪð ˌreɡjuˈleɪʃnz/",
          meaningVi: "tuân thủ các quy định",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.33, y: 0.48 },
          example: "All personnel must strictly comply with building regulations.",
          collocation: "comply with regulations"
        }
      ]
    },
    {
      zoneId: "zone_glass_atrium",
      order: 4,
      label: "Đại sảnh & Cửa ra vào",
      labelEn: "Lobby Atrium & Entrance",
      viewBox: "550 0 450 350",
      center: { x: 0.78, y: 0.25 },
      items: [
        {
          id: "or_revolving_door",
          word: "revolving door",
          ipa: "/rɪˈvɑːlvɪŋ dɔːr/",
          meaningVi: "cửa xoay tự động sảnh lớn",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.65, y: 0.45 },
          example: "Visitors entered the grand lobby through the glass revolving door.",
          collocation: "enter via a revolving door"
        },
        {
          id: "or_glass_facade",
          word: "glass atrium",
          ipa: "/ɡlæs ˈeɪtriəm/",
          meaningVi: "khung kính giếng trời sảnh chính",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.85, y: 0.25 },
          example: "The multi-story glass atrium lets in plenty of natural daylight.",
          collocation: "modern glass atrium"
        },
        {
          id: "or_briefcase",
          word: "leather briefcase",
          ipa: "/ˈleðər ˈbriːfkeɪs/",
          meaningVi: "cặp da công tác",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.74, y: 0.68 },
          example: "The visiting consultant carried a black leather briefcase.",
          collocation: "carry a briefcase"
        },
        {
          id: "or_polished_floor",
          word: "polished terrazzo",
          ipa: "/ˈpɑːlɪʃt təˈrɑːtsoʊ/",
          meaningVi: "sàn đá mài bóng loáng",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.42, y: 0.90 },
          example: "Maintenance staff keep the terrazzo floor clean and polished.",
          collocation: "polished floor"
        },
        {
          id: "or_grant_access",
          word: "grant authorized access",
          ipa: "/ɡrænt ˈɔːθəraɪzd ˈækses/",
          meaningVi: "cấp quyền ra vào hợp lệ",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.96, y: 0.55 },
          example: "The automated system grants access only to authorized personnel.",
          collocation: "grant access"
        }
      ]
    }
  ]
};
fs.writeFileSync(path.join(scenesDir, 'office_rules.json'), JSON.stringify(officeRules, null, 2), 'utf-8');

// 4. Define office_equipment.json (Day 04)
const officeEquipment = {
  sceneId: "office_equipment",
  dayNumber: 4,
  dayTitle: "Day 04: Công việc văn phòng (2)",
  category: "Công việc văn phòng (2)",
  title: "Thiết bị công nghệ & In ấn",
  topic: "Office Equipment & Tech",
  description: "Thiết bị văn phòng, máy in ấn, máy hủy tài liệu và phân công quản lý hồ sơ.",
  image: "/scenes/office_equipment.jpg",
  canvasWidth: 1000,
  canvasHeight: 562.5,
  fullViewBox: "0 0 1000 562.5",
  zones: [
    {
      zoneId: "zone_copier",
      order: 1,
      label: "Máy photocopy & Đa năng",
      labelEn: "Multifunction Copier",
      viewBox: "200 240 420 320",
      center: { x: 0.42, y: 0.60 },
      items: [
        {
          id: "oe_copier",
          word: "photocopier",
          ipa: "/ˈfoʊtoʊkɑːpiər/",
          meaningVi: "máy photocopy đa chức năng",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.42, y: 0.55 },
          example: "The multifunction photocopier can print, scan, and staple reports.",
          collocation: "use the photocopier"
        },
        {
          id: "oe_panel",
          word: "touchscreen panel",
          ipa: "/ˈtʌtʃskriːn ˈpænl/",
          meaningVi: "bảng điều khiển cảm ứng",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.46, y: 0.45 },
          example: "Select two-sided printing on the touchscreen control panel.",
          collocation: "touchscreen panel"
        },
        {
          id: "oe_paper_tray",
          word: "output paper tray",
          ipa: "/ˈaʊtpʊt ˈpeɪpər treɪ/",
          meaningVi: "khay đón giấy in ra",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.30, y: 0.44 },
          example: "Retrieve your printed documents from the top output paper tray.",
          collocation: "paper tray"
        },
        {
          id: "oe_paper_drawer",
          word: "paper feeder drawer",
          ipa: "/ˈpeɪpər ˈfiːdər drɔːr/",
          meaningVi: "ngăn nạp giấy khay dưới",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.43, y: 0.80 },
          example: "Drawer 2 is empty and needs to be reloaded with A4 paper.",
          collocation: "load paper drawer"
        },
        {
          id: "oe_make_copies",
          word: "make copies",
          ipa: "/meɪk ˈkɑːpiz/",
          meaningVi: "sao chụp tài liệu",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.43, y: 0.60 },
          example: "She made fifty double-sided copies of the financial report.",
          collocation: "make copies"
        }
      ]
    },
    {
      zoneId: "zone_shredder",
      order: 2,
      label: "Máy hủy tài liệu & Rác",
      labelEn: "Paper Shredder",
      viewBox: "100 320 300 240",
      center: { x: 0.26, y: 0.75 },
      items: [
        {
          id: "oe_shredder",
          word: "paper shredder",
          ipa: "/ˈpeɪpər ˈʃredər/",
          meaningVi: "máy hủy tài liệu bảo mật",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.27, y: 0.78 },
          example: "Always destroy confidential client contracts in the paper shredder.",
          collocation: "insert into shredder"
        },
        {
          id: "oe_view_window",
          word: "wastebasket window",
          ipa: "/ˈweɪstbæskɪt ˈwɪndoʊ/",
          meaningVi: "khe kính quan sát lượng giấy vụn",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.28, y: 0.84 },
          example: "The clear window shows when the shredder bin is full.",
          collocation: "shredder bin"
        },
        {
          id: "oe_power_switch",
          word: "feed slot",
          ipa: "/fiːd slɑːt/",
          meaningVi: "khe luồn giấy hủy",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.25, y: 0.68 },
          example: "Do not insert paper clips into the document feed slot.",
          collocation: "paper feed slot"
        },
        {
          id: "oe_shredded_paper",
          word: "shredded paper",
          ipa: "/ˈʃredɪd ˈpeɪpər/",
          meaningVi: "giấy vụn đã hủy",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.28, y: 0.88 },
          example: "Empty the bag of shredded paper into the recycling container.",
          collocation: "dispose of shredded paper"
        },
        {
          id: "oe_shred_docs",
          word: "shred confidential files",
          ipa: "/ʃred ˌkɑːnfɪˈdenʃl faɪlz/",
          meaningVi: "hủy tài liệu mật",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.27, y: 0.70 },
          example: "Human resources regularly shreds expired confidential files.",
          collocation: "shred files"
        }
      ]
    },
    {
      zoneId: "zone_sorting_station",
      order: 3,
      label: "Bàn sắp xếp & Dụng cụ in ấn",
      labelEn: "Sorting & Collation Desk",
      viewBox: "500 240 500 320",
      center: { x: 0.75, y: 0.65 },
      items: [
        {
          id: "oe_clerk",
          word: "office assistant",
          ipa: "/ˈɔːfɪs əˈsɪstənt/",
          meaningVi: "nhân viên phụ trách văn thư",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.70, y: 0.40 },
          example: "The office assistant organized the printed meeting handouts.",
          collocation: "assist with printing"
        },
        {
          id: "oe_paper_stack",
          word: "paper ream",
          ipa: "/ˈpeɪpər riːm/",
          meaningVi: "ram giấy in nguyên bao bì",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.64, y: 0.72 },
          example: "Open a fresh ream of letter-sized copy paper.",
          collocation: "ream of paper"
        },
        {
          id: "oe_sorting_tray",
          word: "document sorting tray",
          ipa: "/ˈdɑːkjumənt ˈsɔːrtɪŋ treɪ/",
          meaningVi: "khay phân loại tài liệu",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.81, y: 0.66 },
          example: "Place outgoing invoices in the top document sorting tray.",
          collocation: "in the sorting tray"
        },
        {
          id: "oe_stapler",
          word: "heavy-duty stapler",
          ipa: "/ˈsteɪplər/",
          meaningVi: "bấm kim chuyên dụng",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.77, y: 0.80 },
          example: "Use the heavy-duty stapler to bind the thick quarterly prospectus.",
          collocation: "staple pages together"
        },
        {
          id: "oe_collate",
          word: "sort and collate documents",
          ipa: "/sɔːrt ənd kəˈleɪt ˈdɑːkjumənts/",
          meaningVi: "phân loại & tập hợp tài liệu",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.78, y: 0.58 },
          example: "She sorted and collated documents before distributing them to staff.",
          collocation: "collate documents"
        }
      ]
    },
    {
      zoneId: "zone_filing_system",
      order: 4,
      label: "Tủ hồ sơ thép & Lưu trữ",
      labelEn: "Steel Filing System",
      viewBox: "700 150 300 400",
      center: { x: 0.88, y: 0.48 },
      items: [
        {
          id: "oe_filing_cabinet",
          word: "filing cabinet",
          ipa: "/ˈfaɪlɪŋ ˈkæbɪnət/",
          meaningVi: "tủ sắt đựng hồ sơ",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.90, y: 0.40 },
          example: "Confidential employee files are securely locked inside the filing cabinet.",
          collocation: "store in a cabinet"
        },
        {
          id: "oe_cabinet_handles",
          word: "drawer handle",
          ipa: "/drɔːr ˈhændl/",
          meaningVi: "tay nắm ngăn kéo tủ",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.81, y: 0.32 },
          example: "Each drawer handle has a slot for categorical alphabetical labels.",
          collocation: "pull the handle"
        },
        {
          id: "oe_paper_cutter",
          word: "paper trimmer",
          ipa: "/ˈpeɪpər ˈtrɪmər/",
          meaningVi: "bàn cắt giấy có thước đo",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.69, y: 0.85 },
          example: "Trim the marketing flyers neatly with the rotary paper trimmer.",
          collocation: "trim with a cutter"
        },
        {
          id: "oe_tape_dispenser",
          word: "tape dispenser",
          ipa: "/teɪp dɪˈspensər/",
          meaningVi: "khay cắt băng keo dán",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.95, y: 0.69 },
          example: "The desk tape dispenser was refilled with heavy-duty clear packaging tape.",
          collocation: "tape dispenser"
        },
        {
          id: "oe_archive",
          word: "archive project records",
          ipa: "/ˈɑːrkaɪv ˈprɑːdʒekt ˈrekərdz/",
          meaningVi: "lưu trữ hồ sơ dự án",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.88, y: 0.55 },
          example: "At year-end, the administrative team archives all completed project records.",
          collocation: "archive records"
        }
      ]
    }
  ]
};
fs.writeFileSync(path.join(scenesDir, 'office_equipment.json'), JSON.stringify(officeEquipment, null, 2), 'utf-8');

// 5. Define business_meeting.json (Day 05)
const businessMeeting = {
  sceneId: "business_meeting",
  dayNumber: 5,
  dayTitle: "Day 05: Công việc văn phòng (3)",
  category: "Công việc văn phòng (3)",
  title: "Họp chiến lược & Thuyết trình",
  topic: "Business Meeting & Strategy",
  description: "Báo cáo công tác, điều phối phòng ban, deadline và tiến độ dự án nội bộ.",
  image: "/scenes/business_meeting.jpg",
  canvasWidth: 1000,
  canvasHeight: 562.5,
  fullViewBox: "0 0 1000 562.5",
  zones: [
    {
      zoneId: "zone_presenter_screen",
      order: 1,
      label: "Màn hình thuyết trình số",
      labelEn: "Presentation Display",
      viewBox: "500 150 450 350",
      center: { x: 0.65, y: 0.40 },
      items: [
        {
          id: "bm_screen",
          word: "interactive display",
          ipa: "/ˌɪntərˈæktɪv dɪˈspleɪ/",
          meaningVi: "màn hình thuyết trình tương tác",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.66, y: 0.38 },
          example: "The quarterly revenue growth was illustrated on the large interactive display.",
          collocation: "on the display"
        },
        {
          id: "bm_presenter",
          word: "keynote presenter",
          ipa: "/ˈkiːnoʊt prɪˈzentər/",
          meaningVi: "người thuyết trình chính",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.62, y: 0.48 },
          example: "The keynote presenter summarized performance targets for the upcoming quarter.",
          collocation: "listen to the presenter"
        },
        {
          id: "bm_chart",
          word: "bar chart",
          ipa: "/bɑːr tʃɑːrt/",
          meaningVi: "biểu đồ cột phân tích",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.58, y: 0.42 },
          example: "The bar chart indicated a significant surge in international sales volume.",
          collocation: "illustrate with a chart"
        },
        {
          id: "bm_pie_chart",
          word: "pie graph",
          ipa: "/paɪ ɡræf/",
          meaningVi: "biểu đồ tròn thị phần",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.70, y: 0.47 },
          example: "A circular pie graph broke down expenditures across four major departments.",
          collocation: "pie graph data"
        },
        {
          id: "bm_give_presentation",
          word: "deliver a presentation",
          ipa: "/dɪˈlɪvər ə ˌpreznˈteɪʃn/",
          meaningVi: "trình bày bài thuyết trình",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.68, y: 0.42 },
          example: "She delivered an insightful presentation on market diversification.",
          collocation: "deliver a presentation"
        }
      ]
    },
    {
      zoneId: "zone_conference_table",
      order: 2,
      label: "Bàn họp & Thiết bị máy tính",
      labelEn: "Boardroom Table & Tech",
      viewBox: "100 300 800 262.5",
      center: { x: 0.50, y: 0.75 },
      items: [
        {
          id: "bm_table",
          word: "conference table",
          ipa: "/ˈkɑːnfərəns ˈteɪbl/",
          meaningVi: "bàn họp gỗ dài",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.48, y: 0.78 },
          example: "Ten executives gathered around the polished mahogany conference table.",
          collocation: "sit around the table"
        },
        {
          id: "bm_laptop",
          word: "laptop computer",
          ipa: "/ˈlæptɑːp kəmˈpjuːtər/",
          meaningVi: "máy tính xách tay",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.38, y: 0.68 },
          example: "He referenced updated project spreadsheets on his slim laptop computer.",
          collocation: "open a laptop"
        },
        {
          id: "bm_notebook",
          word: "executive notebook",
          ipa: "/ɪɡˈzekjətɪv ˈnoʊtbʊk/",
          meaningVi: "sổ tay ghi chép biên bản",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.28, y: 0.79 },
          example: "She opened her executive notebook to record key action items.",
          collocation: "take notes in notebook"
        },
        {
          id: "bm_water_glass",
          word: "drinking glass",
          ipa: "/ˈdrɪŋkɪŋ ɡlæs/",
          meaningVi: "ly uống nước của đại biểu",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.40, y: 0.75 },
          example: "Fresh drinking glasses and a lemon water pitcher were provided.",
          collocation: "glass of water"
        },
        {
          id: "bm_take_minutes",
          word: "take meeting minutes",
          ipa: "/teɪk ˈmiːtɪŋ ˈmɪnɪts/",
          meaningVi: "ghi biên bản cuộc họp",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.22, y: 0.77 },
          example: "The secretary is taking meeting minutes to email to all team leads.",
          collocation: "take meeting minutes"
        }
      ]
    },
    {
      zoneId: "zone_attendees_left",
      order: 3,
      label: "Đoàn đại biểu phía trái",
      labelEn: "Attendees & Directors",
      viewBox: "0 200 450 362.5",
      center: { x: 0.22, y: 0.60 },
      items: [
        {
          id: "bm_executive",
          word: "board director",
          ipa: "/bɔːrd dəˈrektər/",
          meaningVi: "thành viên ban giám đốc",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.14, y: 0.68 },
          example: "The board director listened attentively to the sales forecast.",
          collocation: "board director"
        },
        {
          id: "bm_colleague",
          word: "team colleague",
          ipa: "/tiːm ˈkɑːliːɡ/",
          meaningVi: "đồng nghiệp dự án",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.26, y: 0.60 },
          example: "He conferred with his team colleague before voting on the proposal.",
          collocation: "consult with a colleague"
        },
        {
          id: "bm_project_manager",
          word: "project manager",
          ipa: "/ˈprɑːdʒekt ˈmænɪdʒər/",
          meaningVi: "quản lý dự án",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.38, y: 0.58 },
          example: "The project manager answered questions regarding resource allocation.",
          collocation: "project manager"
        },
        {
          id: "bm_chair",
          word: "conference chair",
          ipa: "/ˈkɑːnfərəns tʃer/",
          meaningVi: "ghế họp xoay nệm cao cấp",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.11, y: 0.85 },
          example: "Ergonomic conference chairs were arranged uniformly along the table.",
          collocation: "sit in conference chair"
        },
        {
          id: "bm_listen_attentively",
          word: "listen attentively",
          ipa: "/ˈlɪsn əˈtentɪvli/",
          meaningVi: "chú ý lắng nghe bài nói",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.30, y: 0.55 },
          example: "All participants listened attentively to the financial briefing.",
          collocation: "listen attentively"
        }
      ]
    },
    {
      zoneId: "zone_attendees_right",
      order: 4,
      label: "Đoàn đại biểu phía phải",
      labelEn: "Discussion & Strategic Review",
      viewBox: "650 200 350 362.5",
      center: { x: 0.82, y: 0.60 },
      items: [
        {
          id: "bm_senior_analyst",
          word: "financial analyst",
          ipa: "/faɪˈnænʃl ˈænəlɪst/",
          meaningVi: "chuyên viên phân tích tài chính",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.77, y: 0.55 },
          example: "The financial analyst verified the projected profit margins.",
          collocation: "financial analyst"
        },
        {
          id: "bm_delegate_female",
          word: "department head",
          ipa: "/dɪˈpɑːrtmənt hed/",
          meaningVi: "trưởng bộ phận chuyên môn",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.84, y: 0.68 },
          example: "The marketing department head proposed an expanded digital campaign.",
          collocation: "department head"
        },
        {
          id: "bm_pitcher",
          word: "water pitcher",
          ipa: "/ˈwɔːtər ˈpɪtʃər/",
          meaningVi: "bình thủy tinh đựng nước lọc",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.56, y: 0.80 },
          example: "A tall glass water pitcher was placed in reach of all participants.",
          collocation: "pour from a pitcher"
        },
        {
          id: "bm_glass_wall",
          word: "curtain wall",
          ipa: "/ˈkɜːrtn wɔːl/",
          meaningVi: "vách kính ngoại thất nhìn ra phố",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.08, y: 0.35 },
          example: "The glass curtain wall offers striking views of downtown traffic below.",
          collocation: "glass curtain wall"
        },
        {
          id: "bm_discuss_strategy",
          word: "discuss business strategy",
          ipa: "/dɪˈskʌs ˈbɪznəs ˈstrætədʒi/",
          meaningVi: "thảo luận chiến lược kinh doanh",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.92, y: 0.60 },
          example: "The board members met to discuss corporate expansion strategy.",
          collocation: "discuss business strategy"
        }
      ]
    }
  ]
};
fs.writeFileSync(path.join(scenesDir, 'business_meeting.json'), JSON.stringify(businessMeeting, null, 2), 'utf-8');

// 6. Define leisure_community.json (Day 06)
const leisureCommunity = {
  sceneId: "leisure_community",
  dayNumber: 6,
  dayTitle: "Day 06: Thời gian rảnh - Cộng đồng",
  category: "Thời gian rảnh - Cộng đồng",
  title: "Thời gian rảnh & Cộng đồng",
  topic: "Leisure & Community",
  description: "Hoạt động giải trí sau giờ làm, giao lưu cộng đồng, thể dục thể thao và công viên.",
  image: "/scenes/leisure_community.jpg",
  canvasWidth: 1000,
  canvasHeight: 562.5,
  fullViewBox: "0 0 1000 562.5",
  zones: [
    {
      zoneId: "zone_cafe_patio",
      order: 1,
      label: "Khu cafe hiên ngoài trời",
      labelEn: "Outdoor Cafe Patio",
      viewBox: "0 220 460 342.5",
      center: { x: 0.24, y: 0.65 },
      items: [
        {
          id: "lc_umbrella",
          word: "patio umbrella",
          ipa: "/ˈpætioʊ ʌmˈbrelə/",
          meaningVi: "dù che nắng hiên cafe ngoài trời",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.28, y: 0.35 },
          example: "Customers sat beneath the broad patio umbrellas to escape the midday heat.",
          collocation: "under an umbrella"
        },
        {
          id: "lc_table",
          word: "wooden table",
          ipa: "/ˈwʊdn ˈteɪbl/",
          meaningVi: "bàn gỗ cafe ngoài trời",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.22, y: 0.85 },
          example: "Two friends shared coffee and pastries at an outdoor wooden table.",
          collocation: "sit at a table"
        },
        {
          id: "lc_mug",
          word: "ceramic mug",
          ipa: "/səˈræmɪk mʌɡ/",
          meaningVi: "tách gốm uống cà phê",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.21, y: 0.78 },
          example: "Steaming hot cappuccino was served in heavy white ceramic mugs.",
          collocation: "sip from a mug"
        },
        {
          id: "lc_patron",
          word: "cafe customer",
          ipa: "/kæˈfeɪ ˈkʌstəmər/",
          meaningVi: "thực khách quán cafe",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.33, y: 0.72 },
          example: "The cheerful cafe customer chatted with his friend over breakfast.",
          collocation: "regular customer"
        },
        {
          id: "lc_enjoy_drink",
          word: "enjoy a refreshment",
          ipa: "/ɪnˈdʒɔɪ ə rɪˈfreʃmənt/",
          meaningVi: "thưởng thức thức uống giải khát",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.16, y: 0.72 },
          example: "Office workers enjoyed morning refreshments during their break.",
          collocation: "enjoy a refreshment"
        }
      ]
    },
    {
      zoneId: "zone_cyclist_lane",
      order: 2,
      label: "Làn đường xe đạp & Lối đi bộ",
      labelEn: "Bicycle Pathway",
      viewBox: "400 240 300 322.5",
      center: { x: 0.58, y: 0.65 },
      items: [
        {
          id: "lc_bicycle",
          word: "city bicycle",
          ipa: "/ˈsɪti ˈbaɪsɪkl/",
          meaningVi: "xe đạp dạo phố có giỏ",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.58, y: 0.72 },
          example: "The commuter rode her commuter city bicycle to the transit station.",
          collocation: "ride a bicycle"
        },
        {
          id: "lc_basket",
          word: "front basket",
          ipa: "/frʌnt ˈbæskɪt/",
          meaningVi: "giỏ xe đạp phía trước",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.60, y: 0.64 },
          example: "Her tote bag and a water bottle were placed in the woven front basket.",
          collocation: "bicycle basket"
        },
        {
          id: "lc_cyclist",
          word: "cyclist",
          ipa: "/ˈsaɪklɪst/",
          meaningVi: "người đi xe đạp",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.60, y: 0.54 },
          example: "The cyclist stopped at the intersection to let pedestrians cross safely.",
          collocation: "active cyclist"
        },
        {
          id: "lc_pathway",
          word: "paved walkway",
          ipa: "/peɪvd ˈwɔːkweɪ/",
          meaningVi: "lối đi lát đá trong công viên",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.66, y: 0.88 },
          example: "A smooth paved walkway winds through the landscaped city park.",
          collocation: "walk along the pathway"
        },
        {
          id: "lc_commute",
          word: "commute on a bike",
          ipa: "/kəˈmjuːt ɑːn ə baɪk/",
          meaningVi: "đi làm bằng xe đạp",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.56, y: 0.62 },
          example: "More professionals choose to commute on a bike to stay active.",
          collocation: "commute on a bike"
        }
      ]
    },
    {
      zoneId: "zone_park_bench",
      order: 3,
      label: "Ghế băng công viên & Vườn hoa",
      labelEn: "Park Benches & Garden",
      viewBox: "650 240 350 322.5",
      center: { x: 0.82, y: 0.65 },
      items: [
        {
          id: "lc_bench",
          word: "wooden park bench",
          ipa: "/ˈwʊdn pɑːrk bentʃ/",
          meaningVi: "ghế băng gỗ công viên",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.83, y: 0.72 },
          example: "Senior citizens rested comfortably on the slatted wooden park bench.",
          collocation: "sit on a bench"
        },
        {
          id: "lc_flower_bed",
          word: "flower border",
          ipa: "/ˈflaʊər ˈbɔːrdər/",
          meaningVi: "luống hoa cảnh rực rỡ",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.85, y: 0.60 },
          example: "Purple lavender blossoms flourished along the curved flower border.",
          collocation: "blooming flower bed"
        },
        {
          id: "lc_retirees",
          word: "park visitors",
          ipa: "/pɑːrk ˈvɪzɪtərz/",
          meaningVi: "người dạo mát công viên",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.77, y: 0.64 },
          example: "Park visitors enjoy reading newspapers in the fresh morning air.",
          collocation: "park visitors"
        },
        {
          id: "lc_oak_tree",
          word: "shade tree",
          ipa: "/ʃeɪd triː/",
          meaningVi: "cây cổ thụ tỏa bóng mát",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.40, y: 0.15 },
          example: "Mature oak shade trees provide relief from direct sunshine.",
          collocation: "under a shade tree"
        },
        {
          id: "lc_relax",
          word: "relax in the park",
          ipa: "/rɪˈlæks ɪn ðə pɑːrk/",
          meaningVi: "thư giãn trong công viên",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.80, y: 0.68 },
          example: "Local residents frequently gather to relax in the park after work.",
          collocation: "relax in the park"
        }
      ]
    },
    {
      zoneId: "zone_community_promenade",
      order: 4,
      label: "Khuôn viên phố & Quảng trường",
      labelEn: "Plaza & Promenade",
      viewBox: "450 100 550 300",
      center: { x: 0.70, y: 0.35 },
      items: [
        {
          id: "lc_cafe_sign",
          word: "storefront sign",
          ipa: "/ˈstɔːrfrʌnt saɪn/",
          meaningVi: "biển hiệu cửa hàng mặt tiền",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.45, y: 0.44 },
          example: "A circular storefront sign clearly identified 'The Park Cafe'.",
          collocation: "storefront sign"
        },
        {
          id: "lc_strollers",
          word: "pedestrians",
          ipa: "/pəˈdestriənz/",
          meaningVi: "người đi bộ tản bộ",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.54, y: 0.54 },
          example: "Pedestrians strolled leisurely along the wide car-free promenade.",
          collocation: "group of pedestrians"
        },
        {
          id: "lc_skyline",
          word: "city high-rises",
          ipa: "/ˈsɪti ˈhaɪraɪzɪz/",
          meaningVi: "các tòa nhà cao tầng đô thị",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.63, y: 0.22 },
          example: "Modern glass office high-rises surround the tranquil municipal park.",
          collocation: "urban high-rises"
        },
        {
          id: "lc_dog",
          word: "pet dog",
          ipa: "/pet dɔːɡ/",
          meaningVi: "chú chó đi dạo",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.70, y: 0.56 },
          example: "A playful pet dog trotted on the lawn alongside its owner.",
          collocation: "walk a dog"
        },
        {
          id: "lc_stroll",
          word: "take a leisurely stroll",
          ipa: "/teɪk ə ˈliːʒərli stroʊl/",
          meaningVi: "đi dạo thong thả",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.64, y: 0.52 },
          example: "Families took a leisurely stroll under the sunny blue sky.",
          collocation: "take a stroll"
        }
      ]
    }
  ]
};
fs.writeFileSync(path.join(scenesDir, 'leisure_community.json'), JSON.stringify(leisureCommunity, null, 2), 'utf-8');

// 7. Define airport_travel.json (Day 08)
const airportTravel = {
  sceneId: "airport_travel",
  dayNumber: 8,
  dayTitle: "Day 08: Sân bay & Đi lại",
  category: "Sân bay & Du lịch",
  title: "Sân bay & Di chuyển quốc tế",
  topic: "Airport & Travel",
  description: "Thủ tục lên máy bay, hành lý ký gửi, ga hành khách và di chuyển công tác quốc tế.",
  image: "/scenes/airport_travel.jpg",
  canvasWidth: 1000,
  canvasHeight: 562.5,
  fullViewBox: "0 0 1000 562.5",
  zones: [
    {
      zoneId: "zone_flight_board",
      order: 1,
      label: "Bảng thông tin chuyến bay",
      labelEn: "Flight Information Board",
      viewBox: "340 100 320 280",
      center: { x: 0.50, y: 0.35 },
      items: [
        {
          id: "at_display_board",
          word: "flight departures board",
          ipa: "/flaɪt dɪˈpɑːrtʃərz bɔːrd/",
          meaningVi: "bảng điện tử hiển thị chuyến bay đi",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.50, y: 0.38 },
          example: "Check the flight departures board for gate numbers and boarding times.",
          collocation: "check the board"
        },
        {
          id: "at_terminal_sign",
          word: "terminal signage",
          ipa: "/ˈtɜːrmɪnl ˈsaɪnɪdʒ/",
          meaningVi: "biển chỉ dẫn số nhà ga",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.49, y: 0.31 },
          example: "Yellow terminal signage directed international passengers to Terminal 5.",
          collocation: "follow terminal signage"
        },
        {
          id: "at_suspension",
          word: "steel framework",
          ipa: "/stiːl ˈfreɪmwɜːrk/",
          meaningVi: "khung thép giàn mái nhà ga",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.28, y: 0.15 },
          example: "The vast terminal is supported by intricate architectural steel framework.",
          collocation: "steel framework"
        },
        {
          id: "at_airliner",
          word: "commercial airliner",
          ipa: "/kəˈmɜːrʃl ˈerlaɪnər/",
          meaningVi: "máy bay thương mại ngoài sân đỗ",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.90, y: 0.60 },
          example: "Several commercial airliners were parked at their assigned boarding gates.",
          collocation: "board an airliner"
        },
        {
          id: "at_check_status",
          word: "check flight status",
          ipa: "/tʃek flaɪt ˈsteɪtəs/",
          meaningVi: "kiểm tra tình trạng chuyến bay",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.37, y: 0.70 },
          example: "The businessman stopped to check his flight status on his mobile app.",
          collocation: "check flight status"
        }
      ]
    },
    {
      zoneId: "zone_checkin_counters",
      order: 2,
      label: "Quầy làm thủ tục & Ký gửi",
      labelEn: "Check-in Desks",
      viewBox: "0 220 400 342.5",
      center: { x: 0.18, y: 0.65 },
      items: [
        {
          id: "at_checkin_desk",
          word: "check-in counter",
          ipa: "/ˈtʃek ɪn ˈkaʊntər/",
          meaningVi: "quầy làm thủ tục bay",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.10, y: 0.70 },
          example: "Passengers formed an orderly queue at the airline check-in counter.",
          collocation: "at the check-in counter"
        },
        {
          id: "at_agent",
          word: "airline ground agent",
          ipa: "/ˈerlaɪn ɡraʊnd ˈeɪdʒənt/",
          meaningVi: "nhân viên mặt đất hãng bay",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.16, y: 0.64 },
          example: "The ground agent inspected passports and weighed checked suitcases.",
          collocation: "airline agent"
        },
        {
          id: "at_stanchion",
          word: "queue barrier stanchion",
          ipa: "/kjuː ˈbæriər ˈstæntʃən/",
          meaningVi: "cọc phân luồng xếp hàng",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.28, y: 0.70 },
          example: "Polished metal stanchions with blue straps guided the passenger line.",
          collocation: "queue barrier"
        },
        {
          id: "at_monitor",
          word: "counter screen",
          ipa: "/ˈkaʊntər skriːn/",
          meaningVi: "màn hình hiển thị hạng vé quầy",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.15, y: 0.52 },
          example: "The digital screen indicated counter service for Business Class flyers.",
          collocation: "counter display"
        },
        {
          id: "at_check_luggage",
          word: "check in luggage",
          ipa: "/tʃek ɪn ˈlʌɡɪdʒ/",
          meaningVi: "làm thủ tục ký gửi hành lý",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.20, y: 0.65 },
          example: "He checked in two large bags before heading to security.",
          collocation: "check in luggage"
        }
      ]
    },
    {
      zoneId: "zone_passenger_concourse",
      order: 3,
      label: "Hành khách & Xe đẩy vali",
      labelEn: "Concourse & Luggage Carts",
      viewBox: "320 250 480 312.5",
      center: { x: 0.58, y: 0.75 },
      items: [
        {
          id: "at_cart",
          word: "luggage cart",
          ipa: "/ˈlʌɡɪdʒ kɑːrt/",
          meaningVi: "xe đẩy hành lý sân bay",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.65, y: 0.78 },
          example: "A family loaded four heavy duffel bags onto a metal luggage cart.",
          collocation: "push a luggage cart"
        },
        {
          id: "at_rolling_suitcase",
          word: "wheeled suitcase",
          ipa: "/wiːld ˈsuːtkeɪs/",
          meaningVi: "vali kéo có bánh xe",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.42, y: 0.85 },
          example: "He navigated the crowded terminal pulling his wheeled suitcase behind him.",
          collocation: "pull a wheeled suitcase"
        },
        {
          id: "at_traveler",
          word: "business traveler",
          ipa: "/ˈbɪznəs ˈtrævlər/",
          meaningVi: "hành khách đi công tác",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.37, y: 0.75 },
          example: "The frequent business traveler walked briskly toward the priority lounge.",
          collocation: "business traveler"
        },
        {
          id: "at_duffel",
          word: "carry-on bag",
          ipa: "/ˈkæri ɑːn bæɡ/",
          meaningVi: "túi hành lý xách tay",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.78, y: 0.82 },
          example: "Ensure your carry-on bag fits in the overhead bin dimensions.",
          collocation: "carry-on baggage"
        },
        {
          id: "at_wheel_luggage",
          word: "wheel a suitcase",
          ipa: "/wiːl ə ˈsuːtkeɪs/",
          meaningVi: "kéo đẩy vali di chuyển",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.74, y: 0.76 },
          example: "The passenger wheeled her suitcase toward the passport control gate.",
          collocation: "wheel a suitcase"
        }
      ]
    },
    {
      zoneId: "zone_waiting_lounge",
      order: 4,
      label: "Khu ghế chờ & Cổng khởi hành",
      labelEn: "Seating Area & Windows",
      viewBox: "650 200 350 362.5",
      center: { x: 0.85, y: 0.65 },
      items: [
        {
          id: "at_seating",
          word: "terminal waiting seats",
          ipa: "/ˈtɜːrmɪnl ˈweɪtɪŋ siːts/",
          meaningVi: "dãy ghế chờ nhà ga",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.84, y: 0.74 },
          example: "Tired passengers rested in the rows of airport waiting seats.",
          collocation: "seats in the terminal"
        },
        {
          id: "at_window_curtain",
          word: "curved glass facade",
          ipa: "/kɜːrvd ɡlæs fəˈsɑːd/",
          meaningVi: "vách kính cong kiến trúc sân bay",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.84, y: 0.30 },
          example: "The curved glass facade provides a wide panoramic view of the runway.",
          collocation: "panoramic glass facade"
        },
        {
          id: "at_executive_flyer",
          word: "departing flyer",
          ipa: "/dɪˈpɑːrtɪŋ ˈflaɪər/",
          meaningVi: "hành khách sắp khởi hành",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.93, y: 0.78 },
          example: "A departing flyer in a suit walked briskly toward gate A12.",
          collocation: "departing passenger"
        },
        {
          id: "at_shops",
          word: "duty-free boutique",
          ipa: "/ˈduːti friː buːˈtiːk/",
          meaningVi: "gian hàng miễn thuế sân bay",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.62, y: 0.58 },
          example: "Travelers browsed perfumes and souvenirs at the duty-free boutique.",
          collocation: "duty-free shop"
        },
        {
          id: "at_board_plane",
          word: "board the aircraft",
          ipa: "/bɔːrd ði ˈerkræft/",
          meaningVi: "lên máy bay",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.90, y: 0.70 },
          example: "Passengers with children were invited to board the aircraft first.",
          collocation: "board the aircraft"
        }
      ]
    }
  ]
};
fs.writeFileSync(path.join(scenesDir, 'airport_travel.json'), JSON.stringify(airportTravel, null, 2), 'utf-8');

// 8. Define conference_hall.json (Day 09)
const conferenceHall = {
  sceneId: "conference_hall",
  dayNumber: 9,
  dayTitle: "Day 09: Hội nghị & Thuyết trình",
  category: "Hội nghị & Sự kiện",
  title: "Hội nghị & Thuyết trình diễn giả",
  topic: "Conference & Presentation",
  description: "Hội thảo quốc tế, bục diễn giả chính, slide thị phần thị trường và thính phòng.",
  image: "/scenes/conference_hall.jpg",
  canvasWidth: 1000,
  canvasHeight: 562.5,
  fullViewBox: "0 0 1000 562.5",
  zones: [
    {
      zoneId: "zone_stage_podium",
      order: 1,
      label: "Bục diễn giả & Diễn văn",
      labelEn: "Speaker Podium",
      viewBox: "550 200 450 362.5",
      center: { x: 0.78, y: 0.60 },
      items: [
        {
          id: "ch_lectern",
          word: "acrylic lectern",
          ipa: "/əˈkrɪlɪk ˈlektərn/",
          meaningVi: "bục phát biểu trong suốt",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.72, y: 0.70 },
          example: "The CEO stepped up to the modern transparent acrylic lectern.",
          collocation: "step to the lectern"
        },
        {
          id: "ch_mic",
          word: "gooseneck microphone",
          ipa: "/ˈɡuːsnek ˈmaɪkrəfoʊn/",
          meaningVi: "micro cổ ngỗng phát biểu",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.72, y: 0.52 },
          example: "Speak directly into the gooseneck microphone so the audience can hear.",
          collocation: "speak into microphone"
        },
        {
          id: "ch_speaker",
          word: "keynote speaker",
          ipa: "/ˈkiːnoʊt ˈspiːkər/",
          meaningVi: "diễn giả chính của hội nghị",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.81, y: 0.52 },
          example: "The distinguished keynote speaker addressed innovative market trends.",
          collocation: "listen to the keynote speaker"
        },
        {
          id: "ch_stage",
          word: "stage platform",
          ipa: "/steɪdʒ ˈplætfɔːrm/",
          meaningVi: "sân khấu biểu diễn hội trường",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.82, y: 0.85 },
          example: "Spotlights illuminated the speaker walking across the stage platform.",
          collocation: "on the stage"
        },
        {
          id: "ch_address_audience",
          word: "address the audience",
          ipa: "/əˈdres ði ˈɔːdiəns/",
          meaningVi: "phát biểu trước cử tọa",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.83, y: 0.65 },
          example: "The guest speaker addressed an audience of over one thousand delegates.",
          collocation: "address the audience"
        }
      ]
    },
    {
      zoneId: "zone_giant_screen",
      order: 2,
      label: "Màn hình LED thị trường",
      labelEn: "LED Display & Analytics",
      viewBox: "550 0 450 340",
      center: { x: 0.80, y: 0.25 },
      items: [
        {
          id: "ch_led_screen",
          word: "jumbotron LED screen",
          ipa: "/ˈdʒʌmboʊtrɑːn ˌel iː ˈdiː skriːn/",
          meaningVi: "màn hình LED khổng lồ sân khấu",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.82, y: 0.28 },
          example: "Key statistical graphics were projected onto the high-resolution LED screen.",
          collocation: "on the LED screen"
        },
        {
          id: "ch_statistics",
          word: "market share analytics",
          ipa: "/ˈmɑːrkɪt ʃer ˌænəˈlɪtɪks/",
          meaningVi: "số liệu thống kê thị phần",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.88, y: 0.28 },
          example: "The slide presented market share analytics showing a 32% growth margin.",
          collocation: "market analytics"
        },
        {
          id: "ch_banner",
          word: "conference banner",
          ipa: "/ˈkɑːnfərəns ˈbænər/",
          meaningVi: "biển hiệu chủ đề diễn đàn",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.58, y: 0.38 },
          example: "The banner announced the Global Innovation Forum 2024.",
          collocation: "conference banner"
        },
        {
          id: "ch_truss",
          word: "lighting truss rig",
          ipa: "/ˈlaɪtɪŋ trʌs rɪɡ/",
          meaningVi: "giàn khung đèn sân khấu",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.62, y: 0.10 },
          example: "Heavy spotlights were securely mounted to the aluminum lighting truss.",
          collocation: "lighting rig"
        },
        {
          id: "ch_explain_slides",
          word: "explain statistical data",
          ipa: "/ɪkˈspleɪn stəˈtɪstɪkl ˈdeɪtə/",
          meaningVi: "giải thích số liệu thống kê",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.76, y: 0.44 },
          example: "He paused to clearly explain the statistical data to the attendees.",
          collocation: "explain data"
        }
      ]
    },
    {
      zoneId: "zone_delegates_front",
      order: 3,
      label: "Hàng ghế đại biểu VIP",
      labelEn: "VIP Delegates & Front Rows",
      viewBox: "0 300 550 262.5",
      center: { x: 0.28, y: 0.78 },
      items: [
        {
          id: "ch_vip_delegate",
          word: "conference delegate",
          ipa: "/ˈkɑːnfərəns ˈdelɪɡət/",
          meaningVi: "đại biểu tham dự hội nghị",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.23, y: 0.78 },
          example: "Delegates from thirty nations convened at the opening assembly.",
          collocation: "registered delegate"
        },
        {
          id: "ch_name_tag",
          word: "credentials badge",
          ipa: "/krəˈdenʃlz bædʒ/",
          meaningVi: "thẻ đeo đại biểu chính thức",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.08, y: 0.90 },
          example: "All participants wore printed credentials badges for security clearance.",
          collocation: "wear a badge"
        },
        {
          id: "ch_business_attire",
          word: "formal attire",
          ipa: "/ˈfɔːrml əˈtaɪər/",
          meaningVi: "trang phục dự hội nghị trang trọng",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.35, y: 0.76 },
          example: "Attendees maintained business professional formal attire throughout the event.",
          collocation: "formal attire"
        },
        {
          id: "ch_monitor_speaker",
          word: "stage monitor wedge",
          ipa: "/steɪdʒ ˈmɑːnɪtər wedʒ/",
          meaningVi: "loa kiểm âm sân khấu",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.57, y: 0.85 },
          example: "Audio monitor speakers ensured clear playback for speakers on stage.",
          collocation: "stage speaker"
        },
        {
          id: "ch_applaud",
          word: "applaud the presentation",
          ipa: "/əˈplɔːd ðə ˌpreznˈteɪʃn/",
          meaningVi: "vỗ tay tán thưởng bài nói",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.28, y: 0.84 },
          example: "The delegates applauded warmly at the conclusion of the keynote talk.",
          collocation: "applaud the speaker"
        }
      ]
    },
    {
      zoneId: "zone_auditorium_hall",
      order: 4,
      label: "Khán phòng & Khán giả",
      labelEn: "Auditorium & Seating Tier",
      viewBox: "0 0 550 350",
      center: { x: 0.25, y: 0.30 },
      items: [
        {
          id: "ch_tiered_seating",
          word: "tiered auditorium",
          ipa: "/tɪrd ˌɔːdɪˈtɔːriəm/",
          meaningVi: "khán phòng bậc thang xếp tầng",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.20, y: 0.40 },
          example: "The grand tiered auditorium accommodated a full house of guests.",
          collocation: "tiered auditorium"
        },
        {
          id: "ch_ceiling_panels",
          word: "acoustic ceiling baffles",
          ipa: "/əˈkuːstɪk ˈsiːlɪŋ ˈbæflz/",
          meaningVi: "tấm tiêu âm ốp trần",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.25, y: 0.08 },
          example: "Acoustic ceiling baffles eliminate reverberation and enhance sound clarity.",
          collocation: "acoustic panels"
        },
        {
          id: "ch_balcony",
          word: "mezzanine balcony",
          ipa: "/ˈmezəniːn ˈbælkəni/",
          meaningVi: "tầng lửng khán đài",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.25, y: 0.28 },
          example: "Spectators seated on the mezzanine balcony had an expansive view.",
          collocation: "balcony seating"
        },
        {
          id: "ch_spotlights",
          word: "halogen spotlight",
          ipa: "/ˈhælədʒən ˈspɑːtlaɪt/",
          meaningVi: "đèn chiếu rọi sân khấu",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.41, y: 0.06 },
          example: "Bright halogen spotlights focused directly upon the presenter's podium.",
          collocation: "spotlight beam"
        },
        {
          id: "ch_attend_summit",
          word: "attend a global summit",
          ipa: "/əˈtend ə ˈɡloʊbl ˈsʌmɪt/",
          meaningVi: "tham dự hội nghị thượng đỉnh",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.40, y: 0.65 },
          example: "Over eight hundred specialists attended the annual technology summit.",
          collocation: "attend a summit"
        }
      ]
    }
  ]
};
fs.writeFileSync(path.join(scenesDir, 'conference_hall.json'), JSON.stringify(conferenceHall, null, 2), 'utf-8');

// 9. Define retail_store.json (Day 10)
const retailStore = {
  sceneId: "retail_store",
  dayNumber: 10,
  dayTitle: "Day 10: Mua sắm & Siêu thị",
  category: "Mua sắm & Bán lẻ",
  title: "Mua sắm bán lẻ & Siêu thị",
  topic: "Retail & Supermarket",
  description: "Xe đẩy siêu thị, quầy thanh toán, quét mã vạch và mua sắm tiêu dùng hàng ngày.",
  image: "/scenes/retail_store.jpg",
  canvasWidth: 1000,
  canvasHeight: 562.5,
  fullViewBox: "0 0 1000 562.5",
  zones: [
    {
      zoneId: "zone_checkout_counter",
      order: 1,
      label: "Quầy thu ngân & Quét mã",
      labelEn: "Checkout Register",
      viewBox: "600 240 400 322.5",
      center: { x: 0.85, y: 0.65 },
      items: [
        {
          id: "rs_cashier",
          word: "store cashier",
          ipa: "/stɔːr kæˈʃɪr/",
          meaningVi: "nhân viên thu ngân siêu thị",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.89, y: 0.54 },
          example: "The store cashier greeted the customer with a pleasant smile.",
          collocation: "pay the cashier"
        },
        {
          id: "rs_pos",
          word: "checkout register screen",
          ipa: "/ˈtʃekaʊt ˈredʒɪstər skriːn/",
          meaningVi: "màn hình máy tính tiền POS",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.95, y: 0.65 },
          example: "The total purchase amount appeared on the checkout register screen.",
          collocation: "cash register screen"
        },
        {
          id: "rs_scanner",
          word: "barcode scanner",
          ipa: "/ˈbɑːrkoʊd ˈskænər/",
          meaningVi: "máy quét mã vạch cầm tay",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.83, y: 0.63 },
          example: "The clerk used a wireless barcode scanner to register each item's price.",
          collocation: "scan with barcode scanner"
        },
        {
          id: "rs_card_terminal",
          word: "card payment terminal",
          ipa: "/kɑːrd ˈpeɪmənt ˈtɜːrmɪnl/",
          meaningVi: "máy quẹt thẻ thanh toán",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.89, y: 0.73 },
          example: "Insert your credit card into the chip card payment terminal.",
          collocation: "card payment terminal"
        },
        {
          id: "rs_scan_items",
          word: "scan grocery items",
          ipa: "/skæn ˈɡroʊsəri ˈaɪtəmz/",
          meaningVi: "quét mã hàng hóa tạp hóa",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.86, y: 0.60 },
          example: "She efficiently scanned grocery items and bagged them for the shopper.",
          collocation: "scan items"
        }
      ]
    },
    {
      zoneId: "zone_shopping_cart",
      order: 2,
      label: "Xe đẩy & Giỏ mua sắm",
      labelEn: "Shopping Carts & Baskets",
      viewBox: "100 300 550 262.5",
      center: { x: 0.35, y: 0.70 },
      items: [
        {
          id: "rs_cart",
          word: "metal shopping cart",
          ipa: "/ˈmetl ˈʃɑːpɪŋ kɑːrt/",
          meaningVi: "xe đẩy mua hàng kim loại",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.28, y: 0.75 },
          example: "She filled her metal shopping cart with fresh produce and groceries.",
          collocation: "push a shopping cart"
        },
        {
          id: "rs_basket",
          word: "handheld shopping basket",
          ipa: "/ˈhændheld ˈʃɑːpɪŋ ˈbæskɪt/",
          meaningVi: "giỏ xách mua hàng cầm tay",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.56, y: 0.75 },
          example: "For quick purchases, customers prefer using a handheld shopping basket.",
          collocation: "carry a basket"
        },
        {
          id: "rs_shopper",
          word: "shopper",
          ipa: "/ˈʃɑːpər/",
          meaningVi: "người đi mua sắm",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.16, y: 0.60 },
          example: "The shopper checked her handwritten grocery list before choosing products.",
          collocation: "frequent shopper"
        },
        {
          id: "rs_customer_basket",
          word: "customer in aisle",
          ipa: "/ˈkʌstəmər ɪn aɪl/",
          meaningVi: "khách hàng đứng giữa lối đi",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.62, y: 0.62 },
          example: "A customer walked along the center aisle looking for breakfast cereal.",
          collocation: "in the aisle"
        },
        {
          id: "rs_push_cart",
          word: "push a shopping cart",
          ipa: "/pʊʃ ə ˈʃɑːpɪŋ kɑːrt/",
          meaningVi: "đẩy xe mua hàng",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.20, y: 0.72 },
          example: "She pushed the shopping cart along the wide clean supermarket aisles.",
          collocation: "push a cart"
        }
      ]
    },
    {
      zoneId: "zone_shelves_aisles",
      order: 3,
      label: "Kệ trưng bày & Lối đi",
      labelEn: "Display Shelves & Aisles",
      viewBox: "0 200 400 362.5",
      center: { x: 0.18, y: 0.45 },
      items: [
        {
          id: "rs_shelves",
          word: "display shelf unit",
          ipa: "/dɪˈspleɪ ʃelf ˈjuːnɪt/",
          meaningVi: "kệ trưng bày hàng hóa nhiều tầng",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.08, y: 0.50 },
          example: "Beverages were neatly lined up on the sturdy display shelf unit.",
          collocation: "on the shelf"
        },
        {
          id: "rs_bottles",
          word: "bottled goods",
          ipa: "/ˈbɑːtld ɡʊdz/",
          meaningVi: "sản phẩm đóng chai",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.08, y: 0.62 },
          example: "The store stocked premium imported juices and bottled goods.",
          collocation: "bottled goods"
        },
        {
          id: "rs_price_tag",
          word: "shelf price tag",
          ipa: "/ʃelf praɪs tæɡ/",
          meaningVi: "tem nhãn giá dán mép kệ",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.08, y: 0.78 },
          example: "Compare unit costs shown on the yellow shelf price tags.",
          collocation: "check the price tag"
        },
        {
          id: "rs_aisle_floor",
          word: "aisle walkway",
          ipa: "/aɪl ˈwɔːkweɪ/",
          meaningVi: "lối đi giữa hai dãy kệ hàng",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.38, y: 0.72 },
          example: "Keep the wide supermarket aisle walkway free of unattended carts.",
          collocation: "walk down the aisle"
        },
        {
          id: "rs_browse",
          word: "browse merchandise",
          ipa: "/braʊz ˈmɜːrtʃəndaɪs/",
          meaningVi: "xem lướt qua hàng hóa",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.38, y: 0.50 },
          example: "Shoppers browsed the newly arrived seasonal merchandise.",
          collocation: "browse merchandise"
        }
      ]
    },
    {
      zoneId: "zone_produce_department",
      order: 4,
      label: "Khu rau quả & Biển ngành hàng",
      labelEn: "Department Signage & Produce",
      viewBox: "300 100 500 300",
      center: { x: 0.55, y: 0.35 },
      items: [
        {
          id: "rs_produce_sign",
          word: "department signage",
          ipa: "/dɪˈpɑːrtmənt ˈsaɪnɪdʒ/",
          meaningVi: "biển tên phân loại gian hàng",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.48, y: 0.34 },
          example: "Clear overhead department signage marked 'Fresh Produce' and 'Bakery'.",
          collocation: "store signage"
        },
        {
          id: "rs_produce_stand",
          word: "produce display counter",
          ipa: "/ˈprɑːduːs dɪˈspleɪ ˈkaʊntər/",
          meaningVi: "quầy rau củ quả tươi",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.51, y: 0.45 },
          example: "Crisp organic apples and oranges were stacked in the produce display counter.",
          collocation: "fresh produce counter"
        },
        {
          id: "rs_overhead_lights",
          word: "linear fluorescent fixture",
          ipa: "/ˈlɪniər ˈflɔːrənt ˈfɪkstʃər/",
          meaningVi: "dãy đèn dài chiếu sáng siêu thị",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.16, y: 0.10 },
          example: "Long linear fluorescent light fixtures provide bright, uniform illumination.",
          collocation: "overhead lighting"
        },
        {
          id: "rs_grocery_bag",
          word: "paper grocery bag",
          ipa: "/ˈpeɪpər ˈɡroʊsəri bæɡ/",
          meaningVi: "túi giấy đựng hàng hóa",
          pos: "noun",
          visualType: "object",
          hotspot: { x: 0.69, y: 0.62 },
          example: "The cashier packed dry goods into recyclable paper grocery bags.",
          collocation: "pack in a bag"
        },
        {
          id: "rs_pay_cashier",
          word: "settle the bill at checkout",
          ipa: "/ˈsetl ðə bɪl æt ˈtʃekaʊt/",
          meaningVi: "thanh toán hóa đơn tại quầy",
          pos: "phrase",
          visualType: "action",
          hotspot: { x: 0.70, y: 0.52 },
          example: "Customers can settle the bill at checkout using contactless mobile pay.",
          collocation: "settle the bill"
        }
      ]
    }
  ]
};
fs.writeFileSync(path.join(scenesDir, 'retail_store.json'), JSON.stringify(retailStore, null, 2), 'utf-8');

// 10. Generate index.js in src/data/scenes/
const indexJsContent = `// Master Scene Data Index
import JOB_INTERVIEW from './job_interview.json';
import OFFICE_RULES from './office_rules.json';
import OFFICE_MAIN from './office_main.json';
import OFFICE_EQUIPMENT from './office_equipment.json';
import BUSINESS_MEETING from './business_meeting.json';
import LEISURE_COMMUNITY from './leisure_community.json';
import RESTAURANT_CAFE from './restaurant_cafe.json';
import AIRPORT_TRAVEL from './airport_travel.json';
import CONFERENCE_HALL from './conference_hall.json';
import RETAIL_STORE from './retail_store.json';

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

export {
  JOB_INTERVIEW,
  OFFICE_RULES,
  OFFICE_MAIN,
  OFFICE_EQUIPMENT,
  BUSINESS_MEETING,
  LEISURE_COMMUNITY,
  RESTAURANT_CAFE,
  AIRPORT_TRAVEL,
  CONFERENCE_HALL,
  RETAIL_STORE,
};
`;

fs.writeFileSync(path.join(scenesDir, 'index.js'), indexJsContent, 'utf-8');
console.log('Successfully generated all 10 scenes with 20 words each!');
