export type Branch = 'cot_song' | 'yoga'

export type AcademyPackage = {
  code: string
  slug: string
  branch: Branch
  branchLabel: string
  name: string
  summary: string
  accessMonths: number
  supportDays: number | null
  requiresScreening: boolean
  includesCertification: boolean
}

export const academyPackages: AcademyPackage[] = [
  { code: 'A1', slug: 'tac-dong-cot-song-nen-tang', branch: 'cot_song', branchLabel: 'TĐCS', name: 'Tác động cột sống Nền tảng', summary: 'Làm quen hệ thống kiến thức, cách học và các tiêu chí nền tảng.', accessMonths: 12, supportDays: 60, requiresScreening: true, includesCertification: false },
  { code: 'A2', slug: 'tac-dong-cot-song-hybrid', branch: 'cot_song', branchLabel: 'TĐCS', name: 'Tác động cột sống Hybrid', summary: 'Kết hợp học liệu, tương tác và thực hành trực tiếp trong phạm vi được duyệt.', accessMonths: 18, supportDays: 90, requiresScreening: true, includesCertification: false },
  { code: 'A3', slug: 'tac-dong-cot-song-chuyen-sau', branch: 'cot_song', branchLabel: 'TĐCS', name: 'Tác động cột sống Chuyên sâu', summary: 'Lộ trình hồ sơ, đánh giá và hoàn thành theo tiêu chí công khai.', accessMonths: 24, supportDays: 365, requiresScreening: true, includesCertification: true },
  { code: 'B1', slug: 'yoga-can-bang', branch: 'yoga', branchLabel: 'Yoga', name: 'Yoga Cân bằng', summary: 'Chương trình nhập môn để xây dựng thói quen vận động phù hợp.', accessMonths: 6, supportDays: 30, requiresScreening: false, includesCertification: false },
  { code: 'B2', slug: 'yoga-deo-dai-dang-dep', branch: 'yoga', branchLabel: 'Yoga', name: 'Yoga Dẻo dai & Dáng đẹp', summary: 'Tập trung vào sức mạnh, linh hoạt và kiểm soát chuyển động.', accessMonths: 9, supportDays: 60, requiresScreening: false, includesCertification: false },
  { code: 'B3', slug: 'dao-tao-giao-vien-yoga', branch: 'yoga', branchLabel: 'Yoga', name: 'Đào tạo giáo viên Yoga', summary: 'Lộ trình hướng dẫn, thực tập và đánh giá theo phạm vi công bố.', accessMonths: 24, supportDays: 365, requiresScreening: true, includesCertification: true },
]

export const getPackageBySlug = (slug: string) => academyPackages.find((item) => item.slug === slug)

export const branchContent = {
  cot_song: {
    title: 'Tác động cột sống',
    intro: 'Một lộ trình học hệ thống tài liệu, quan sát, ghi nhận và thực hành có hướng dẫn trong phạm vi chương trình.',
    principles: ['Tách kiến thức giải phẫu, thuật ngữ của phương pháp và các phát biểu cần rà soát chuyên môn.', 'Phân biệt module kiến thức, sáu buổi live và điều kiện của từng gói.', 'Không biến nội dung đào tạo thành hướng dẫn tự chẩn đoán hoặc cam kết điều trị.'],
    packages: academyPackages.filter((item) => item.branch === 'cot_song'),
  },
  yoga: {
    title: 'Yoga',
    intro: 'Các chương trình Yoga được tổ chức theo mục tiêu, hình thức học và mức độ hỗ trợ; không hứa hẹn kết quả sức khỏe cố định.',
    principles: ['Bắt đầu từ nhận biết cơ thể, hơi thở và chuyển động phù hợp.', 'Theo dõi thói quen và kỹ thuật thay vì dùng một con số kết quả chung cho mọi người.', 'Chương trình đào tạo hướng dẫn chỉ mở khi có đề cương, người dạy và tiêu chí đánh giá tương ứng.'],
    packages: academyPackages.filter((item) => item.branch === 'yoga'),
  },
}