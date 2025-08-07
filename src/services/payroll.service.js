const User = require('../models/user.model');
const Attendance = require('../models/attendance.model');
const PerformanceReview = require('../models/performanceReview.model');
const Payroll = require('../models/payroll.model');
const PerformanceBonus = require('../models/performanceBonus.model');
const sendEmail = require('../utils/sendEmail');
const { PAYROLL_MESSAGES } = require('../constants/payroll.messages');
const { ADMIN_MESSAGES } = require('../constants/admin.messages');
const { GENERAL_MESSAGES } = require('../constants/auth.messages');

// Trả về mảng các ngày T2-T7 trong tháng (loại CN)
function getWorkingDaysInMonth(year, month) {
    let days = [];
    const d = new Date(year, month - 1, 1);
    while (d.getMonth() === month - 1) {
        if (d.getDay() !== 0) days.push(new Date(d));
        d.setDate(d.getDate() + 1);
    }
    return days;
}
// Chênh giờ giữa 2 time
function hoursDiff(start, end) {
    if (!start || !end) return 0;
    return (end - start) / (1000 * 60 * 60);
}

// ===== calculatePayrollService.js =====
const calculatePayrollService = async (payrollInput) => {
  try {
    /* ------------------------------------------------------------------ */
    /* 1. GIẢI NÉN INPUT + KIỂM TRA TỒN TẠI                               */
    /* ------------------------------------------------------------------ */
    const {
      user_id, month, year,
      diligence_required_days, diligence_bonus_amount,
      other_bonus, ot_multiplier, dev_mode
    } = payrollInput;

    if (
      !user_id || !month || !year ||
      diligence_required_days === undefined ||
      diligence_bonus_amount === undefined
    ) {
      return { status: 400, ok: false, message: PAYROLL_MESSAGES.INFO_MISSING };
    }

    /* ------------------------------------------------------------------ */
    /* 2. LẤY USER + XOÁ PAYROLL CŨ (NẾU MUỐN TÍNH LẠI)                   */
    /* ------------------------------------------------------------------ */
    const user = await User.findById(user_id);
    if (!user) return { status: 404, ok: false, message: ADMIN_MESSAGES.USER_NOT_FOUND };

    const oldPayroll = await Payroll.findOne({ user_id, month, year });
    const isRecalculation = !!oldPayroll;
    if (isRecalculation) await Payroll.deleteOne({ _id: oldPayroll._id });

    /* ------------------------------------------------------------------ */
    /* 3. THƯỞNG HIỆU QUẢ & REVIEW                                        */
    /* ------------------------------------------------------------------ */
    const bonusRules = await PerformanceBonus.find({ is_active: true });
    if (!bonusRules.length) {
      return { status: 500, ok: false, message: "Chưa có cấu hình tiền thưởng hiệu quả." };
    }
    const perfBonusCfg = bonusRules.reduce((obj, r) => (obj[r.grade] = r.bonus_amount, obj), {});

    const review = await PerformanceReview.findOne({ user_id, month, year });
    if (!review) {
      return { status: 400, ok: false, message: PAYROLL_MESSAGES.REVIEW_NOT_FOUND(month, year) };
    }

    /* ------------------------------------------------------------------ */
    /* 4. CONSTANTS                                                       */
    /* ------------------------------------------------------------------ */
    const MIN_HOUR_FULL_DAY = 8 + 10 / 60;                 // 8h10 = 8.1667
    const OT_MULTIPLIER     = ot_multiplier > 0 ? ot_multiplier : 1.2;

    /* ------------------------------------------------------------------ */
    /* 5. LẤY ATTENDANCE TRONG THÁNG                                      */
    /* ------------------------------------------------------------------ */
    const startDate = new Date(year, month - 1, 1);
    const endDate   = new Date(year, month, 0, 23, 59, 59, 999);

    const attendances = await Attendance.find({
      user_id,
      is_deleted: false,
      work_date: { $gte: startDate, $lte: endDate }
    });

    const workingDates = dev_mode
      ? attendances.map(a => a.work_date)
      : getWorkingDaysInMonth(year, month);

    const attMap = {};
    attendances.forEach(a => attMap[a.work_date.toISOString().slice(0, 10)] = a);

    /* helper: “4 giờ 15 phút” -> 4.25 */
    const parseWorkTime = (str) => {
      if (!str) return null;
      const m = str.match(/(\d+)\s*giờ\s*(\d+)\s*phút/i);
      return m ? (+m[1] + +m[2] / 60) : null;
    };
    const hoursDiff = (s, e) => (!s || !e) ? 0 : (e - s) / 3_600_000;

    /* ------------------------------------------------------------------ */
    /* 6. DUYỆT MỖI NGÀY → TÍNH CÔNG, OT, ĐI TRỄ                          */
    /* ------------------------------------------------------------------ */
    let workingDays = 0, lackingDays = 0;
    let overtimeHours = 0;
    let lateCount = 0, lateDetails = [];
    const dayDetails = [];

    for (const d of workingDates) {
      const dayStr  = (typeof d === 'string') ? d : d.toISOString().slice(0, 10);
      const record  = attMap[dayStr];
      let totHours  = 0, isLate = false, lateTypes = [];

      if (record) {
        const m = record.morning   || {}, a = record.afternoon || {};
        const mH = parseWorkTime(m.total_work_time) ??
                   hoursDiff(m.check_in_time && new Date(m.check_in_time),
                             m.check_out_time && new Date(m.check_out_time));
        const aH = parseWorkTime(a.total_work_time) ??
                   hoursDiff(a.check_in_time && new Date(a.check_in_time),
                             a.check_out_time && new Date(a.check_out_time));
        totHours = mH + aH;

        /* check late */
        const mIn = m.check_in_time && new Date(m.check_in_time);
        const aIn = a.check_in_time && new Date(a.check_in_time);
        if (mIn && (mIn.getHours() > 8 || (mIn.getHours() === 8 && mIn.getMinutes() > 0))) {
          isLate = true; lateTypes.push("late-morning"); lateCount++;
          lateDetails.push({ date: dayStr, ca: "morning", hour: mIn.getHours(), minute: mIn.getMinutes(), lateType: "late-morning" });
        }
        if (aIn && (aIn.getHours() > 13 || (aIn.getHours() === 13 && aIn.getMinutes() > 0))) {
          isLate = true; lateTypes.push("late-afternoon"); lateCount++;
          lateDetails.push({ date: dayStr, ca: "afternoon", hour: aIn.getHours(), minute: aIn.getMinutes(), lateType: "late-afternoon" });
        }

        /* công & OT */
        if (totHours >= MIN_HOUR_FULL_DAY) workingDays++; else lackingDays++;
        if (totHours > MIN_HOUR_FULL_DAY)  overtimeHours += totHours - MIN_HOUR_FULL_DAY;
      } else {
        lackingDays++;
      }

      dayDetails.push({ date: dayStr, totalHours: totHours, isLate, lateTypes });
    }

    /* ------------------------------------------------------------------ */
    /* 7. DÙNG OT BÙ THIẾU NGÀY TRƯỚC, PHẦN DƯ MỚI LÀ OT THỰC NHẬN        */
    /* ------------------------------------------------------------------ */
    const hoursNeed = lackingDays * MIN_HOUR_FULL_DAY;
    const otUsedToFill = Math.min(overtimeHours, hoursNeed);
    workingDays += Math.floor(otUsedToFill / MIN_HOUR_FULL_DAY);
    overtimeHours -= otUsedToFill;

    /* ------------------------------------------------------------------ */
    /* 8. TÍNH LƯƠNG                                                      */
    /* ------------------------------------------------------------------ */
    const diligenceBonus = (workingDays >= diligence_required_days) ? diligence_bonus_amount : 0;
    const baseSalary     = workingDays * user.base_salary_per_day;
    const otSalary       = overtimeHours * (user.base_salary_per_day / 8) * OT_MULTIPLIER;
    const perfBonus      = perfBonusCfg[review.grade] || 0;
    const totalSalary    = baseSalary + diligenceBonus + perfBonus + otSalary + (other_bonus || 0);

    /* ------------------------------------------------------------------ */
    /* 9. LƯU PAYROLL                                                     */
    /* ------------------------------------------------------------------ */
    const payroll = await Payroll.create({
      user_id, month, year,
      working_days: workingDays,
      diligence_required_days,
      base_salary_per_day: user.base_salary_per_day,
      base_salary: baseSalary,
      diligence_bonus: diligenceBonus,
      performance_bonus: perfBonus,
      other_bonus: other_bonus || 0,
      total_salary: totalSalary,
      ot_hours : Math.round(overtimeHours * 100) / 100,
      ot_salary: Math.round(otSalary),
      lateness_count : lateCount,
      lateness_details: lateDetails,
      status: 'pending',
      all_day_details: dayDetails
    });

    const payrollPopulated = await Payroll.findById(payroll._id)
                                          .populate('user_id', 'full_name email');

    /* ------------------------------------------------------------------ */
    /* 10. GỬI EMAIL                                                      */
    /* ------------------------------------------------------------------ */
    let latenessHtml = '';
    if (lateDetails.length) {
      latenessHtml = `
        <p>Các lượt đi trễ:</p>
        <ul>
          ${lateDetails.map(l => `<li>${l.date} - ${l.ca === 'morning' ? 'Trễ sáng' : 'Trễ chiều'} (${String(l.hour).padStart(2,'0')}:${String(l.minute).padStart(2,'0')})</li>`).join('')}
        </ul>`;
    }

    try {
      const emailSubject = `[WorkLocus] ${isRecalculation ? "Cập nhật bảng lương" : "Thông Báo Lương"} Tháng ${month}/${year} của bạn`;
      const emailHtml = `
        <div style="font-family:Arial, sans-serif; line-height:1.6;">
          <h2>${isRecalculation ? "Cập nhật bảng lương" : "Thông Báo Lương Tháng"} ${month}/${year}</h2>
          <p>Xin chào <strong>${user.full_name}</strong>,</p>
          <p>Chi tiết bảng lương tháng ${month}/${year}:</p>
          <table style="width:100%;border-collapse:collapse;border:1px solid #ddd;">
            <thead style="background:#f2f2f2;">
              <tr><th style="padding:8px;border:1px solid #ddd;text-align:left;">Diễn giải</th><th style="padding:8px;border:1px solid #ddd;text-align:right;">Số tiền (VNĐ)</th></tr>
            </thead>
            <tbody>
              <tr><td style="padding:8px;border:1px solid #ddd;">Đơn giá lương ngày</td><td style="padding:8px;border:1px solid #ddd;text-align:right;">${user.base_salary_per_day.toLocaleString('vi-VN')}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;">Số ngày công thực tế</td><td style="padding:8px;border:1px solid #ddd;text-align:right;">${workingDays}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;">Lương cơ bản</td><td style="padding:8px;border:1px solid #ddd;text-align:right;">${baseSalary.toLocaleString('vi-VN')}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;">Thưởng chuyên cần (đủ ${diligence_required_days} ngày)</td><td style="padding:8px;border:1px solid #ddd;text-align:right;">+ ${diligenceBonus.toLocaleString('vi-VN')}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;">Thưởng hiệu quả (hạng ${review.grade})</td><td style="padding:8px;border:1px solid #ddd;text-align:right;">+ ${perfBonus.toLocaleString('vi-VN')}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;">Thưởng/Phụ cấp khác</td><td style="padding:8px;border:1px solid #ddd;text-align:right;">+ ${(other_bonus || 0).toLocaleString('vi-VN')}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;">Số giờ làm thêm thực nhận</td><td style="padding:8px;border:1px solid #ddd;text-align:right;">${(Math.round(overtimeHours*100)/100).toFixed(2)} giờ</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;">Tiền làm thêm giờ (hệ số ${OT_MULTIPLIER})</td><td style="padding:8px;border:1px solid #ddd;text-align:right;">+ ${Math.round(otSalary).toLocaleString('vi-VN')}</td></tr>
              <tr style="background:#f2f2f2;"><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">TỔNG THỰC LÃNH</td><td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold;font-size:1.1em;">${totalSalary.toLocaleString('vi-VN')}</td></tr>
            </tbody>
          </table>
          <p>Số lượt đi trễ trong tháng: <b>${lateCount}</b></p>
          ${latenessHtml}
          <p>Lương sẽ được thanh toán theo chính sách của công ty.</p>
        </div>`;
      await sendEmail(user.email, emailSubject, emailHtml);
      console.log(`✅ Đã gửi ${isRecalculation ? "cập nhật" : "bảng"} lương cho ${user.email}`);
    } catch (mailErr) {
      console.error("❌ Lỗi gửi email lương:", mailErr);
    }

    /* ------------------------------------------------------------------ */
    /* 11. RETURN                                                         */
    /* ------------------------------------------------------------------ */
    return {
      status: 201, ok: true,
      message: PAYROLL_MESSAGES.CALCULATION_SUCCESS,
      data: {
        ...payrollPopulated.toObject(),
        ot_hours : Math.round(overtimeHours * 100) / 100,
        ot_salary: Math.round(otSalary)
      }
    };

  } catch (err) {
    console.error("calculatePayrollService error:", err);
    return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
  }
};

// ===== searchPayrollsService.js =====
const searchPayrollsService = async ({ searchCondition = {}, pageInfo = {} }) => {
  try {
    const { keyword, user_id, month, year } = searchCondition;
    const page   = parseInt(pageInfo.pageNum)  || 1;
    const limit  = parseInt(pageInfo.pageSize) || 10;
    const skip   = (page - 1) * limit;

    /* 1. BUILD QUERY --------------------------------------------------- */
    const query = {};
    if (keyword) {
      const ids = (await User.find({ full_name: { $regex: keyword, $options: "i" } })
                             .select("_id")).map(u => u._id);
      if (!ids.length)
        return {
          status: 200, ok: true, message: "Không tìm thấy nhân viên.",
          data: { records: [], pagination: { currentPage: 1, totalPages: 0, totalRecords: 0 } }
        };
      query.user_id = { $in: ids };
    }
    if (user_id) query.user_id = user_id;
    if (month)   query.month   = month;
    if (year)    query.year    = year;

    /* 2. QUERY PAYROLL ------------------------------------------------- */
    const totalRecords = await Payroll.countDocuments(query);
    let records = await Payroll.find(query)
      .populate("user_id", "full_name email role")
      .sort({ year: -1, month: -1, created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    /* 3. (re)CALC OT WHEN NEEDED -------------------------------------- */
    const MIN_HOUR_FULL_DAY = 8 + 10 / 60;

    for (const r of records) {
      if (r.ot_hours && r.ot_hours > 0) continue;   // đã có & >0: bỏ qua

      /* Nếu field trống hoặc 0 ⇒ tính lại */
      let ot = 0;

      if (Array.isArray(r.all_day_details) && r.all_day_details.length) {
        r.all_day_details.forEach(d => {
          const h = typeof d.totalHours === "number" ? d.totalHours : 0;
          if (h > MIN_HOUR_FULL_DAY) ot += (h - MIN_HOUR_FULL_DAY);
        });
      } else {
        // fallback: lấy Attendance từng tháng (hiếm khi cần)
        const start = new Date(r.year, r.month - 1, 1);
        const end   = new Date(r.year, r.month, 0, 23, 59, 59, 999);
        const atts  = await Attendance.find({
          user_id : r.user_id._id,
          is_deleted: false,
          work_date: { $gte: start, $lte: end }
        }).lean();

        const parseWork = (t) => {
          if (!t) return null;
          const m = t.match(/(\d+)\s*giờ\s*(\d+)\s*phút/i);
          return m ? (+m[1] + +m[2] / 60) : null;
        };
        const diff = (s,e)=>(!s||!e)?0:(e-s)/3_600_000;

        atts.forEach(a=>{
          const m=a.morning||{},A=a.afternoon||{};
          const h1=parseWork(m.total_work_time)??diff(m.check_in_time&&new Date(m.check_in_time),m.check_out_time&&new Date(m.check_out_time));
          const h2=parseWork(A.total_work_time)??diff(A.check_in_time&&new Date(A.check_in_time),A.check_out_time&&new Date(A.check_out_time));
          const th = h1+h2;
          if (th > MIN_HOUR_FULL_DAY) ot += th - MIN_HOUR_FULL_DAY;
        });
      }

      r.ot_hours  = Math.round(ot * 100) / 100;
      r.ot_salary = Math.round(
        ot * (r.base_salary_per_day / 8) * (r.ot_multiplier || 1.2)
      );
    }

    /* 4. RETURN -------------------------------------------------------- */
    return {
      status: 200, ok: true, message: "Tìm kiếm lịch sử lương thành công.",
      data: {
        records,
        pagination: {
          currentPage: page,
          totalPages : Math.ceil(totalRecords / limit),
          totalRecords
        }
      }
    };

  } catch (err) {
    console.error("ERROR in searchPayrollsService:", err);
    return { status: 500, ok: false, message: "Lỗi hệ thống khi tìm kiếm lịch sử lương." };
  }
};

module.exports = {
    calculatePayrollService,
    searchPayrollsService,
};
