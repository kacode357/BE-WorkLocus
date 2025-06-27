const User = require('../models/user.model');
const Attendance = require('../models/attendance.model');
const PerformanceReview = require('../models/performanceReview.model');
const Payroll = require('../models/payroll.model');
const PerformanceBonus = require('../models/performanceBonus.model');
const { PAYROLL_MESSAGES } = require('../constants/payroll.messages');
const { ADMIN_MESSAGES } = require('../constants/admin.messages');
const { GENERAL_MESSAGES } = require('../constants/auth.messages');
const sendEmail = require('../utils/sendEmail'); // << THÊM IMPORT SENDMAIL >>

const calculatePayrollService = async (payrollInput) => {
    try {
        const { user_id, month, year, diligence_required_days, diligence_bonus_amount, other_bonus } = payrollInput;
        
        // ... Toàn bộ logic tính toán giữ nguyên như cũ ...
        if (!user_id || !month || !year || diligence_required_days === undefined || diligence_bonus_amount === undefined) {
            return { status: 400, ok: false, message: PAYROLL_MESSAGES.INFO_MISSING };
        }
        const bonusRules = await PerformanceBonus.find({ is_active: true });
        if (!bonusRules || bonusRules.length === 0) {
            return { status: 500, ok: false, message: "Lỗi hệ thống: Chưa có cấu hình tiền thưởng hiệu quả nào được thiết lập." };
        }
        const performance_bonus_config = bonusRules.reduce((config, rule) => {
            config[rule.grade] = rule.bonus_amount;
            return config;
        }, {});
        const user = await User.findById(user_id);
        if (!user) {
            return { status: 404, ok: false, message: ADMIN_MESSAGES.USER_NOT_FOUND };
        }
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        const working_days = await Attendance.countDocuments({ user_id, is_deleted: false, work_date: { $gte: startDate, $lte: endDate } });
        const base_salary = working_days * user.base_salary_per_day;
        const diligence_bonus = (working_days >= diligence_required_days) ? diligence_bonus_amount : 0;
        const review = await PerformanceReview.findOne({ user_id, month, year });
        if (!review) {
            return { status: 400, ok: false, message: PAYROLL_MESSAGES.REVIEW_NOT_FOUND(month, year) };
        }
        const performance_bonus = performance_bonus_config[review.grade] !== undefined 
            ? performance_bonus_config[review.grade] 
            : 0;
        const total_salary = base_salary + diligence_bonus + performance_bonus + (other_bonus || 0);
        const payrollData = {
            user_id, month, year, working_days, base_salary_per_day: user.base_salary_per_day,
            base_salary, diligence_bonus, performance_bonus, other_bonus: other_bonus || 0, total_salary
        };
        const finalPayroll = await Payroll.findOneAndUpdate({ user_id, month, year }, payrollData, { new: true, upsert: true })
            .populate('user_id', 'full_name email');
        
        
        // << BẮT ĐẦU LOGIC GỬI EMAIL SAU KHI TÍNH LƯƠNG THÀNH CÔNG >>
        try {
            const emailSubject = `[WorkLocus] Bảng lương tháng ${month}/${year} của bạn`;
            
            // Dùng toLocaleString('vi-VN') để format số cho đẹp (ví dụ: 1,000,000)
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Thông Báo Lương Tháng ${month}/${year}</h2>
                    <p>Xin chào <strong>${user.full_name}</strong>,</p>
                    <p>WorkLocus xin gửi bạn chi tiết bảng lương tháng ${month}/${year}:</p>
                    <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
                        <thead style="background-color: #f2f2f2;">
                            <tr>
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Diễn giải</th>
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Số tiền (VNĐ)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;">Đơn giá lương ngày</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${user.base_salary_per_day.toLocaleString('vi-VN')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;">Số ngày công</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${working_days}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Lương cơ bản</strong></td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;"><strong>${base_salary.toLocaleString('vi-VN')}</strong></td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;">Thưởng chuyên cần</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">+ ${diligence_bonus.toLocaleString('vi-VN')}</td>
                            </tr>
                             <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;">Thưởng hiệu quả công việc (Hạng ${review.grade})</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">+ ${performance_bonus.toLocaleString('vi-VN')}</td>
                            </tr>
                             <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;">Thưởng/Phụ cấp khác</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">+ ${(other_bonus || 0).toLocaleString('vi-VN')}</td>
                            </tr>
                            <tr style="background-color: #f2f2f2;">
                                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">TỔNG THỰC LÃNH</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; font-size: 1.1em;">${total_salary.toLocaleString('vi-VN')}</td>
                            </tr>
                        </tbody>
                    </table>
                    <p>Lương sẽ được thanh toán theo chính sách của công ty. Vui lòng liên hệ bộ phận nhân sự nếu có bất kỳ thắc mắc nào.</p>
                    <p>Trân trọng,<br><strong>Đội ngũ WorkLocus</strong></p>
                </div>
            `;

            await sendEmail(user.email, emailSubject, emailHtml);
            console.log(`✅ Gửi mail lương thành công cho ${user.email}`);

        } catch (emailError) {
            // Nếu gửi mail lỗi, chỉ log ra chứ không làm ảnh hưởng đến kết quả API
            console.error(`❌ Lỗi khi gửi mail lương cho ${user.email}:`, emailError);
        }
        // << KẾT THÚC LOGIC GỬI EMAIL >>
        

        // API vẫn trả về kết quả thành công như bình thường
        return { status: 200, ok: true, message: PAYROLL_MESSAGES.CALCULATION_SUCCESS, data: finalPayroll };

    } catch (error) {
        console.error("ERROR in calculatePayrollService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

// Hàm getPayrollsService không thay đổi
const getPayrollsService = async ({ searchCondition, pageInfo }) => {
    // ... code giữ nguyên ...
};

module.exports = {
    calculatePayrollService,
    getPayrollsService,
};