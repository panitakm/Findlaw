const getAuthHeaders = () => ({ 'Authorization': 'Bearer ' + Auth.getToken(), 'Content-Type': 'application/json' });
// Data State
let users = [];
let pendingLawyers = [];
let reportedReviews = [];

// Navigation Logic
document.addEventListener('DOMContentLoaded', () => {
    // 1. Sidebar Menu Switching
    const navLinks = document.querySelectorAll('#adminSidebarNav .nav-link');
    const sections = document.querySelectorAll('.admin-section');
    const pageTitleHeader = document.getElementById('pageTitleHeader');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            // Add active class to clicked link
            link.classList.add('active');

            // Hide all sections
            sections.forEach(s => s.classList.add('d-none'));
            // Show target section
            const targetId = link.getAttribute('data-target');
            document.getElementById(targetId).classList.remove('d-none');

            // Update Header Title
            pageTitleHeader.textContent = link.querySelector('span:nth-child(2)').textContent;
        });
    });

    // Update Header Title initially
    pageTitleHeader.textContent = 'ภาพรวมระบบ';

    // 2. Initial Render
    renderOverviewDashboard();
    renderUsers();
    renderPendingLawyers();
    renderReviews();

    // 3. User Form Submit
    document.getElementById('userForm').addEventListener('submit', handleUserSubmit);
    
    // 4. Reject Lawyer Form Submit
    document.getElementById('rejectLawyerForm').addEventListener('submit', handleRejectLawyerSubmit);
});

// ==========================================
// Dashboard Overview Logic
// ==========================================
function renderOverviewDashboard() {
    fetch('/admin/dashboard/overview', { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
            // Update Summary Cards
            document.getElementById('statPendingLawyers').textContent = data.pendingLawyers || 0;
            document.getElementById('statReportedReviews').textContent = data.reportedReviews || 0;
            document.getElementById('statTotalLawyers').textContent = data.totalLawyers || 0;
            document.getElementById('statTotalUsers').textContent = data.totalUsers || 0;

            // Render Recent Pending Lawyers
            const recentLawyersTbody = document.getElementById('recentPendingLawyersBody');
            if (data.recentPendingLawyers && data.recentPendingLawyers.length > 0) {
                recentLawyersTbody.innerHTML = data.recentPendingLawyers.map(l => {
                    const dateObj = new Date(l.created_at);
                    const date = dateObj.toLocaleDateString('th-TH');
                    const time = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                    const licenseLink = l.license_file ? `<a href="${l.license_file}" target="_blank" class="text-primary"><i class="fa-solid fa-file-lines"></i> ดูเอกสาร</a>` : '<span class="text-muted">-</span>';
                    return `
                    <tr>
                        <td class="small">${date}</td>
                        <td class="text-muted small">${time} น.</td>
                        <td>
                            <div class="small">${l.first_name} ${l.last_name}</div>
                        </td>
                        <td>
                            <div class="small">${l.license_number}</div>
                            <div class="small">${licenseLink}</div>
                        </td>
                    </tr>
                    `;
                }).join('');
            } else {
                recentLawyersTbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">ไม่มีทนายความรอตรวจสอบ</td></tr>`;
            }

            // Render Recent Reported Reviews
            const recentReviewsTbody = document.getElementById('recentReportedReviewsBody');
            if (data.recentReportedReviews && data.recentReportedReviews.length > 0) {
                recentReviewsTbody.innerHTML = data.recentReportedReviews.map(r => {
                    const rDateObj = new Date(r.created_at);
                    const rDate = rDateObj.toLocaleDateString('th-TH');
                    const rTime = rDateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                    
                    let reviewTextHtml = (r.text === null || String(r.text).trim() === '' || String(r.text) === 'null') 
                        ? '<span class="text-muted fst-italic">- ไม่มีข้อความรีวิว -</span>' 
                        : r.text;
                        
                    let flagBadgeHtml = '';
                    if (r.flagReason && r.flagReason.trim() !== '') {
                        let cleanReason = r.flagReason.replace(/\[รีพอร์ตรีวิว\]\s*/g, '').replace(/\[รีพอร์ตการตอบกลับ\]\s*/g, '');
                        flagBadgeHtml = `<div class="small mt-1"><span class="badge bg-danger"><i class="fa-solid fa-triangle-exclamation me-1"></i>${cleanReason}</span></div>`;
                    }
                    
                    return `
                    <tr>
                        <td class="small">${rDate}</td>
                        <td class="text-muted small">${rTime} น.</td>
                        <td>
                            <div class="small">${r.reviewer}</div>
                            <div class="small text-muted"><i class="fa-solid fa-reply fa-rotate-180 me-1"></i>${r.lawyer}</div>
                        </td>
                        <td>
                            <div class="text-truncate small" style="max-width: 250px;" title="${r.text || ''}">${reviewTextHtml}</div>
                            ${flagBadgeHtml}
                        </td>
                    </tr>
                    `;
                }).join('');
            } else {
                recentReviewsTbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">ไม่มีรีวิวถูกรายงาน</td></tr>`;
            }
        })
        .catch(err => console.error('Error loading dashboard overview:', err));
}

// ==========================================
// User Management Logic
// ==========================================
function renderUsers() {
    fetch('/admin/users', { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
            users = data;
            const tbody = document.getElementById('userTableBody');
            tbody.innerHTML = users.map(u => {
                let roleColor = 'bg-secondary';
                const role = (u.role || '').toLowerCase();
                if (role === 'admin') roleColor = 'bg-dark';
                else if (role === 'lawyer') roleColor = 'bg-primary';
                else if (role === 'client' || role === 'user') roleColor = 'bg-success';
                
                let statusHtml = '';
                if (role === 'lawyer' && u.lawyer_status === 'pending') {
                    statusHtml = `<span class="badge bg-warning-subtle text-dark px-3 py-2 rounded-pill shadow-sm" style="font-weight: 500;">รอตรวจสอบ</span>`;
                } else {
                    statusHtml = `<span class="badge-status ${u.user_status === 'active' ? 'badge-active' : 'badge-suspended'}">
                                    ${u.user_status === 'active' ? 'ใช้งาน' : 'ระงับ'}
                                  </span>`;
                }
                
                return `
                <tr>
                    <td>${u.first_name} ${u.last_name}</td>
                    <td>${u.email}</td>
                    <td><span class="badge ${roleColor}">${(u.role || '').toUpperCase()}</span></td>
                    <td>
                        ${statusHtml}
                    </td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-light rounded-pill px-3 py-1 fw-semibold text-primary shadow-sm me-1" onclick="editUser(${u.id})" title="แก้ไข">
                            <i class="fa-solid fa-pen me-1"></i>
                        </button>
                        <button class="btn btn-sm btn-light rounded-pill px-3 py-1 fw-semibold text-danger shadow-sm" onclick="deleteUser(${u.id})" title="ลบ">
                            <i class="fa-solid fa-trash me-1"></i>
                        </button>
                    </td>
                </tr>
                `;
            }).join('');
        })
        .catch(err => console.error(err));
}

let userModal;
function openUserModal(id = null) {
    const modalEl = document.getElementById('userModal');
    if (!userModal) userModal = new bootstrap.Modal(modalEl);
    
    const form = document.getElementById('userForm');
    form.reset();
    document.getElementById('userId').value = '';
    
    if (id) {
        document.getElementById('userModalTitle').textContent = 'แก้ไขสถานะ/บทบาทผู้ใช้';
        const user = users.find(u => u.id === id);
        if (user) {
            document.getElementById('userId').value = user.id;
            document.getElementById('userNameInput').value = `${user.first_name || ''} ${user.last_name || ''}`;
            document.getElementById('userNameInput').readOnly = true;
            document.getElementById('userEmailInput').value = user.email;
            document.getElementById('userEmailInput').readOnly = true;
            document.getElementById('userRoleInput').value = user.role;
            document.getElementById('userStatusInput').value = user.status;
        }
    }
    
    userModal.show();
}

function editUser(id) {
    openUserModal(id);
}

function deleteUser(id) {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้ออกจากระบบ?")) {
        fetch('/admin/users/' + id, { headers: getAuthHeaders(),  method: 'DELETE' })
            .then(() => renderUsers())
            .catch(err => console.error(err));
    }
}

function handleUserSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('userId').value;
    const role = document.getElementById('userRoleInput').value;
    const status = document.getElementById('userStatusInput').value;

    if (id) {
        const user = users.find(u => u.id == id);
        fetch('/admin/users/' + id, { headers: getAuthHeaders(), 
            method: 'PUT',

            body: JSON.stringify({ 
                first_name: user.first_name, 
                last_name: user.last_name, 
                email: user.email, 
                role, 
                status 
            })
        }).then(() => renderUsers()).catch(err => console.error(err));
    }

    userModal.hide();
}

// ==========================================
// Lawyer Verification Logic
// ==========================================
let lawyerVerifyHistory = [];

function renderPendingLawyers() {
    fetch('/admin/lawyers/pending', { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
            pendingLawyers = data;
            const tbody = document.getElementById('lawyerVerifyTableBody');
            if (pendingLawyers.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">ไม่มีคำร้องขอที่รอตรวจสอบ</td></tr>`;
            } else {
                tbody.innerHTML = pendingLawyers.map((l, index) => `
                    <tr>
                        <td class="text-muted text-center">${index + 1}</td>
                        <td>${l.date}</td>
                        <td class="text-muted">${l.time || ''} น.</td>
                        <td>${l.name}</td>
                        <td class="text-primary">${l.license}</td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-outline-primary rounded-pill px-3 shadow-sm" onclick="openLawyerDetailModal(${l.id})" title="ดูรายละเอียด">
                                ดูรายละเอียด
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
            renderLawyerVerifyHistory();
        })
        .catch(err => console.error(err));
}

function renderLawyerVerifyHistory() {
    fetch('/admin/lawyers/history', { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
            lawyerVerifyHistory = data;
            const tbody = document.getElementById('lawyerHistoryTableBody');
            if (lawyerVerifyHistory.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">ยังไม่มีประวัติการตรวจสอบคำร้อง</td></tr>`;
                return;
            }

            tbody.innerHTML = lawyerVerifyHistory.map(l => {
                let statusHtml = '';
                if (l.status === 'approved') {
                    statusHtml = `<span class="badge bg-success"><i class="fa-solid fa-circle-check me-1"></i>อนุมัติแล้ว</span>`;
                } else {
                    statusHtml = `
                        <span class="badge bg-danger"><i class="fa-solid fa-circle-xmark me-1"></i>ปฏิเสธ</span>
                        <div class="small text-muted mt-1 text-truncate" style="max-width: 150px;" title="${l.rejectReason}">เหตุผล: ${l.rejectReason}</div>
                    `;
                }

                return `
                    <tr>
                        <td class="fw-bold text-primary">${l.license}</td>
                        <td>${l.name}</td>
                        <td>${l.date}</td>
                        <td>
                            <a href="#" class="text-decoration-none" onclick="openViewFileModal('${l.file}'); return false;"><i class="fa-solid fa-file-pdf text-danger me-1"></i>${l.file}</a>
                        </td>
                        <td class="text-center">
                            ${statusHtml}
                        </td>
                    </tr>
                `;
            }).join('');
        })
        .catch(err => console.error(err));
}

let detailModal;
async function openLawyerDetailModal(lawyerId) {
    if (!detailModal) {
        detailModal = new bootstrap.Modal(document.getElementById('lawyerDetailModal'));
    }
    document.getElementById('detailLawyerId').value = lawyerId;

    try {
        const res = await fetch(`/lawyers/${lawyerId}/edit`);
        if (!res.ok) throw new Error('Failed to fetch lawyer details');
        const data = await res.json();
        
        const p = data.profile;
        document.getElementById('detailProfileImg').src = p.image_path || '/css/pic/person-circle.svg';
        document.getElementById('detailFullName').textContent = p.full_name || '-';
        document.getElementById('detailPhone').textContent = p.phone || '-';
        document.getElementById('detailEmail').textContent = p.email || '-';
        document.getElementById('detailLine').textContent = p.line_id || '-';
        document.getElementById('detailFacebook').textContent = p.facebook_url || '-';
        document.getElementById('detailLicenseNumber').textContent = p.license_number || '-';
        document.getElementById('detailFeeRate').textContent = p.fee_rate ? p.fee_rate.toLocaleString() : '-';
        
        // Handle License Document
        const fileExt = p.license_file ? p.license_file.split('.').pop().toLowerCase() : '';
        const imgEl = document.getElementById('detailLicenseImg');
        const pdfEl = document.getElementById('detailLicensePdf');
        const phEl = document.getElementById('detailLicensePlaceholder');
        const linkEl = document.getElementById('detailLicenseLink');
        
        imgEl.classList.add('d-none');
        pdfEl.classList.add('d-none');
        phEl.classList.remove('d-none');
        linkEl.classList.add('d-none');

        if (p.license_file) {
            phEl.classList.add('d-none');
            linkEl.href = p.license_file;
            linkEl.classList.remove('d-none');
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
                imgEl.src = p.license_file;
                imgEl.classList.remove('d-none');
            } else if (fileExt === 'pdf') {
                pdfEl.src = p.license_file;
                pdfEl.classList.remove('d-none');
            } else {
                phEl.classList.remove('d-none');
            }
        }

        // Fetch Provinces for Province Name
        const provRes = await fetch('/provinces');
        let provName = '-';
        if (provRes.ok) {
            const provinces = await provRes.json();
            const province = provinces.find(pr => pr.id === p.province_id);
            if (province) provName = province.name_th;
        }
        
        document.getElementById('detailProvince').textContent = provName;
        document.getElementById('detailAddress').textContent = p.office_address || '-';
        document.getElementById('detailFeeRate').textContent = p.fee_rate ? p.fee_rate.toLocaleString() : '-';

        // Specialties
        const specContainer = document.getElementById('detailSpecialties');
        if (data.specialties && data.specialties.length > 0) {
            specContainer.innerHTML = data.specialties.map(s => `<span class="badge bg-warning text-dark px-3 py-2 rounded-pill">${s.name}</span>`).join('');
        } else {
            specContainer.innerHTML = '<span class="text-muted small">- ไม่มีข้อมูล -</span>';
        }

        // Schedules
        const daysMap = { 
            0: 'อาทิตย์', 1: 'จันทร์', 2: 'อังคาร', 3: 'พุธ', 4: 'พฤหัสบดี', 5: 'ศุกร์', 6: 'เสาร์',
            'Sunday': 'อาทิตย์', 'Monday': 'จันทร์', 'Tuesday': 'อังคาร', 'Wednesday': 'พุธ', 
            'Thursday': 'พฤหัสบดี', 'Friday': 'ศุกร์', 'Saturday': 'เสาร์'
        };
        const schedContainer = document.getElementById('detailSchedules');
        if (data.schedules && data.schedules.length > 0) {
            schedContainer.innerHTML = data.schedules.map(s => {
                if(s.is_open) {
                    return `<div class="d-flex justify-content-between mb-2 pb-1 border-bottom border-light">
                        <span>วัน${daysMap[s.day_of_week] || ''}</span>
                        <span class="fw-medium text-success">${s.time_start ? s.time_start.slice(0,5) : ''} - ${s.time_end ? s.time_end.slice(0,5) : ''} น.</span>
                    </div>`;
                } else {
                    return `<div class="d-flex justify-content-between mb-2 pb-1 border-bottom border-light">
                        <span class="text-muted">วัน${daysMap[s.day_of_week] || ''}</span>
                        <span class="text-danger small">ปิดทำการ</span>
                    </div>`;
                }
            }).join('');
        } else {
            schedContainer.innerHTML = '<span class="text-muted">- ไม่มีข้อมูล -</span>';
        }

        // Educations
        const eduContainer = document.getElementById('detailEducations');
        if (data.educations && data.educations.length > 0) {
            eduContainer.innerHTML = data.educations.map(e => `
                <div class="mb-3 position-relative">
                    <div class="position-absolute bg-primary rounded-circle" style="width: 10px; height: 10px; left: -15px; top: 5px;"></div>
                    <div class="fw-bold">${e.degree}</div>
                    <div class="text-muted small">${e.university}</div>
                    <div class="text-muted small">${e.year_start} - ${e.year_end || 'ปัจจุบัน'}</div>
                </div>
            `).join('');
        } else {
            eduContainer.innerHTML = '<span class="text-muted small ms-2">- ไม่มีข้อมูล -</span>';
        }

        // Works
        const workContainer = document.getElementById('detailWorks');
        if (data.works && data.works.length > 0) {
            workContainer.innerHTML = data.works.map(w => `
                <div class="mb-3 position-relative">
                    <div class="position-absolute bg-success rounded-circle" style="width: 10px; height: 10px; left: -15px; top: 5px;"></div>
                    <div class="fw-bold">${w.job_position}</div>
                    <div class="text-muted small">${w.company_name}</div>
                    <div class="text-muted small">${w.year_start} - ${w.year_end || 'ปัจจุบัน'}</div>
                </div>
            `).join('');
        } else {
            workContainer.innerHTML = '<span class="text-muted small ms-2">- ไม่มีข้อมูล -</span>';
        }
        
        detailModal.show();
    } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูลทนายความ');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btnApprove = document.getElementById('btnDetailApprove');
    const btnReject = document.getElementById('btnDetailReject');
    if (btnApprove) {
        btnApprove.addEventListener('click', () => {
            const id = document.getElementById('detailLawyerId').value;
            if (id) {
                detailModal.hide();
                approveLawyer(id);
            }
        });
    }
    if (btnReject) {
        btnReject.addEventListener('click', () => {
            const id = document.getElementById('detailLawyerId').value;
            if (id) {
                detailModal.hide();
                openRejectLawyerModal(id);
            }
        });
    }
});


let viewFileModal;
function openViewFileModal(filename) {
    document.getElementById('displayFileName').textContent = filename;
    
    const container = document.getElementById('fileViewerContainer');
    const placeholder = document.getElementById('fileViewerPlaceholder');
    
    container.innerHTML = '';
    placeholder.style.display = 'block';
    container.style.display = 'none';

    if (filename && filename !== '') {
        const fileUrl = '' + filename;
        const ext = filename.split('.').pop().toLowerCase();
        
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
            container.innerHTML = `<img src="${fileUrl}" class="img-fluid" style="max-height: 70vh; object-fit: contain;" alt="Attachment">`;
        } else {
            container.innerHTML = `<iframe src="${fileUrl}" class="w-100 h-100" style="border: none;"></iframe>`;
        }
        
        placeholder.style.display = 'none';
        container.style.display = 'block';
    }

    const modalEl = document.getElementById('viewFileModal');
    if (!viewFileModal) {
        viewFileModal = new bootstrap.Modal(modalEl);
    }
    viewFileModal.show();
}

// Old approve/reject functions removed
// ==========================================
// Review Moderation Logic
// ==========================================
// Review Moderation Logic
// ==========================================
let reviewHistory = [];

function reportReview(id) {
    if (confirm("เปลี่ยนสถานะรีวิวนี้เป็น 'รอตรวจสอบ' หรือไม่?")) {
        fetch('/admin/reviews/' + id + '/report', { headers: getAuthHeaders(), method: 'PUT' })
            .then(() => renderReviews())
            .catch(err => console.error(err));
    }
}

function renderReviews() {
    // 1. Fetch reported reviews (Wait for review)
    fetch('/admin/reviews/reported', { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
            reportedReviews = data;
            document.getElementById('reportedReviewCountBadge').textContent = reportedReviews.length;
            const tbody = document.getElementById('reviewTableBody');
            if (reportedReviews.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">
                    <i class="fa-solid fa-box fs-1 d-block mb-3 opacity-50"></i>
                    ไม่มีข้อมูลรีวิวรอตรวจสอบ
                </td></tr>`;
            } else {
                tbody.innerHTML = reportedReviews.map((r, index) => {
                    let starsHtml = '';
                    for(let i=1; i<=5; i++) {
                        starsHtml += i <= r.rating ? '<i class="fa-solid fa-star text-warning"></i>' : '<i class="fa-regular fa-star text-muted opacity-25"></i>';
                    }
                    
                    let reviewerHtml = `
                    <div class="d-flex flex-column gap-1">
                        <div class="d-flex flex-wrap align-items-center gap-1">
                            <span class="fw-bold text-dark">${r.reviewer}</span>
                            <span class="badge bg-secondary-subtle text-secondary px-2 py-1" style="font-size: 0.65rem; font-weight: 500;">ผู้ใช้งาน</span>
                        </div>
                        <div class="d-flex align-items-start" style="margin-left: 0.5rem;">
                            <div style="flex: 0 0 12px; height: 16px; border-left: 2px solid #adb5bd; border-bottom: 2px solid #adb5bd; margin-right: 6px; border-bottom-left-radius: 4px; transform: translateY(-4px);"></div>
                            <div style="font-size: 0.85rem; line-height: 1.5; transform: translateY(-2px);">
                                <span class="text-secondary">${r.lawyer}</span>
                                <span class="badge bg-primary-subtle text-primary px-2 py-1 ms-1" style="font-size: 0.65rem; font-weight: 500; vertical-align: text-bottom;">ทนายความ</span>
                            </div>
                        </div>
                    </div>`;

                    let flagBadgeHtml = '<span class="text-muted fst-italic">- ไม่มีหมายเหตุ -</span>';
                    if (r.flagReason && r.flagReason.trim() !== '') {
                        let cleanReason = r.flagReason.replace(/\[รีพอร์ตรีวิว\]\s*/g, '').replace(/\[รีพอร์ตการตอบกลับ\]\s*/g, '');
                        flagBadgeHtml = `<span class="text-danger fw-medium">${cleanReason}</span>`;
                    }
                    
                    let reviewTextHtml = (r.text === null || r.text.trim() === '' || r.text === 'null') 
                        ? '<span class="text-muted fst-italic">- ไม่มีข้อความรีวิว -</span>' 
                        : r.text;

                    if (r.reply && r.reply.trim() !== '') {
                        reviewTextHtml += `
                        <div class="rounded p-2 mt-2 text-dark" style="background-color: #f1f3f5; border: 1px solid #dee2e6; font-size: 0.9rem;">
                            <i class="fa-solid fa-reply fa-rotate-180 me-1 text-primary"></i><strong>ทนายตอบกลับ: </strong>${r.reply}
                        </div>`;
                    }

                    let actionHtml = `
                    <div class="dropdown">
                        <button class="btn btn-sm bg-white border border-secondary-subtle rounded-3 dropdown-toggle px-2 py-1 text-warning d-flex justify-content-between align-items-center w-100" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <span class="text-truncate">รอตรวจสอบ</span>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0" style="border-radius: 8px; font-size: 0.9rem;">
                            <li><a class="dropdown-item py-2 text-success fw-medium" href="#" onclick="approveReview(${r.id}); return false;">เผยแพร่</a></li>
                            <li><a class="dropdown-item py-2 text-warning fw-medium" href="#" onclick="reportReview(${r.id}); return false;">รอตรวจสอบ</a></li>
                            <li><a class="dropdown-item py-2 text-danger fw-medium" href="#" onclick="deleteReview(${r.id}); return false;">ซ่อน</a></li>
                        </ul>
                    </div>`;

                    return `
                    <tr>
                        <td class="text-center text-muted fw-medium">${index + 1}</td>
                        <td>${reviewerHtml}</td>
                        <td class="text-center">${starsHtml}</td>
                        <td>
                            <div class="text-break" title="${(r.text || '').replace(/"/g, '&quot;')}">${reviewTextHtml}</div>
                        </td>
                        <td>${flagBadgeHtml}</td>
                        <td class="text-center">
                            <span class="badge bg-warning-subtle text-warning-emphasis">รอตรวจสอบ</span>
                        </td>
                        <td class="text-center">
                            ${actionHtml}
                        </td>
                    </tr>
                `}).join('');
            }
        })
        .catch(err => console.error(err));

    // 2. Fetch all reviews
    fetch('/admin/reviews/all', { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
            document.getElementById('allReviewCountBadge').textContent = data.length;
            const tbody = document.getElementById('allReviewsTableBody');
            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">
                    <i class="fa-solid fa-box fs-1 d-block mb-3 opacity-50"></i>
                    ไม่มีข้อมูลรีวิวในระบบ
                </td></tr>`;
            } else {
                tbody.innerHTML = data.map((r, index) => {
                    let starsHtml = '';
                    for(let i=1; i<=5; i++) {
                        starsHtml += i <= r.rating ? '<i class="fa-solid fa-star text-warning"></i>' : '<i class="fa-regular fa-star text-muted opacity-25"></i>';
                    }
                    
                    let reviewerHtml = `
                    <div class="d-flex flex-column gap-1">
                        <div class="d-flex flex-wrap align-items-center gap-1">
                            <span class="fw-bold text-dark">${r.reviewer}</span>
                            <span class="badge bg-secondary-subtle text-secondary px-2 py-1" style="font-size: 0.65rem; font-weight: 500;">ผู้ใช้งาน</span>
                        </div>
                        <div class="d-flex align-items-start" style="margin-left: 0.5rem;">
                            <div style="flex: 0 0 12px; height: 16px; border-left: 2px solid #adb5bd; border-bottom: 2px solid #adb5bd; margin-right: 6px; border-bottom-left-radius: 4px; transform: translateY(-4px);"></div>
                            <div style="font-size: 0.85rem; line-height: 1.5; transform: translateY(-2px);">
                                <span class="text-secondary">${r.lawyer}</span>
                                <span class="badge bg-primary-subtle text-primary px-2 py-1 ms-1" style="font-size: 0.65rem; font-weight: 500; vertical-align: text-bottom;">ทนายความ</span>
                            </div>
                        </div>
                    </div>`;

                    let flagBadgeHtml = '<span class="text-muted fst-italic">- ไม่มีหมายเหตุ -</span>';
                    if (r.flagReason && r.flagReason.trim() !== '') {
                        let cleanReason = r.flagReason.replace(/\[รีพอร์ตรีวิว\]\s*/g, '').replace(/\[รีพอร์ตการตอบกลับ\]\s*/g, '');
                        flagBadgeHtml = `<span class="text-danger fw-medium">${cleanReason}</span>`;
                    }
                    
                    let statusHtml = '';
                    let actionBtnText = 'Actions';
                    let actionBtnClass = 'text-secondary';

                    if (r.status === 'published') {
                        statusHtml = '<span class="badge bg-success-subtle text-success">เผยแพร่</span>';
                        actionBtnText = 'เผยแพร่';
                        actionBtnClass = 'text-success';
                    } else if (r.status === 'reported') {
                        statusHtml = '<span class="badge bg-warning-subtle text-warning-emphasis">รอตรวจสอบ</span>';
                        actionBtnText = 'รอตรวจสอบ';
                        actionBtnClass = 'text-warning';
                    } else if (r.status === 'hidden') {
                        statusHtml = '<span class="badge bg-danger-subtle text-danger">ซ่อน</span>';
                        actionBtnText = 'ซ่อน';
                        actionBtnClass = 'text-danger';
                    } else {
                        statusHtml = `<span class="badge bg-secondary-subtle text-secondary">${r.status}</span>`;
                        actionBtnText = r.status;
                    }
                    
                    let reviewTextHtml = (r.text === null || r.text.trim() === '' || r.text === 'null') 
                        ? '<span class="text-muted fst-italic">- ไม่มีข้อความรีวิว -</span>' 
                        : r.text;

                    if (r.reply && r.reply.trim() !== '') {
                        reviewTextHtml += `
                        <div class="rounded p-2 mt-2 text-dark" style="background-color: #f1f3f5; border: 1px solid #dee2e6; font-size: 0.9rem;">
                            <i class="fa-solid fa-reply fa-rotate-180 me-1 text-primary"></i><strong>ทนายตอบกลับ: </strong>${r.reply}
                        </div>`;
                    }

                    let actionHtml = `
                    <div class="dropdown">
                        <button class="btn btn-sm bg-white border border-secondary-subtle rounded-3 dropdown-toggle px-2 py-1 ${actionBtnClass} d-flex justify-content-between align-items-center w-100" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <span class="text-truncate">${actionBtnText}</span>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0" style="border-radius: 8px; font-size: 0.9rem;">
                            <li><a class="dropdown-item py-2 text-success fw-medium" href="#" onclick="approveReview(${r.id}); return false;">เผยแพร่</a></li>
                            <li><a class="dropdown-item py-2 text-warning fw-medium" href="#" onclick="reportReview(${r.id}); return false;">รอตรวจสอบ</a></li>
                            <li><a class="dropdown-item py-2 text-danger fw-medium" href="#" onclick="deleteReview(${r.id}); return false;">ซ่อน</a></li>
                        </ul>
                    </div>`;

                    return `
                    <tr>
                        <td class="text-center text-muted fw-medium">${index + 1}</td>
                        <td>${reviewerHtml}</td>
                        <td class="text-center">${starsHtml}</td>
                        <td>
                            <div class="text-break" title="${(r.text || '').replace(/"/g, '&quot;')}">${reviewTextHtml}</div>
                        </td>
                        <td>${flagBadgeHtml}</td>
                        <td class="text-center">
                            ${statusHtml}
                        </td>
                        <td class="text-center">
                            ${actionHtml}
                        </td>
                    </tr>
                    `;
                }).join('');
            }
        })
        .catch(err => console.error(err));
}

function approveReview(id) {
    if (confirm("อนุมัติให้รีวิวนี้แสดงในหน้าโปรไฟล์ของทนายความหรือไม่?")) {
        fetch('/admin/reviews/' + id + '/approve', { headers: getAuthHeaders(),  method: 'PUT' })
            .then(() => {
                renderReviews();
                alert("รีวิวได้รับการอนุมัติ");
            })
            .catch(err => console.error(err));
    }
}

function deleteReview(id) {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการระงับ/ซ่อนรีวิวนี้?")) {
        fetch('/admin/reviews/' + id, { headers: getAuthHeaders(),  method: 'DELETE' })
            .then(() => renderReviews())
            .catch(err => console.error(err));
    }
}

// --- Reject Modal Logic ---
function openRejectLawyerModal(id) {
    document.getElementById('rejectLawyerId').value = id;
    document.getElementById('rejectReason').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('rejectLawyerModal'));
    modal.show();
}

function handleRejectLawyerSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('rejectLawyerId').value;
    const reason = document.getElementById('rejectReason').value;
    rejectLawyer(id, reason);
}

function rejectLawyer(id, reason) {
    fetch('/admin/lawyers/' + id + '/reject', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
        },
        body: JSON.stringify({ reason })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('rejectLawyerModal'));
            modal.hide();
            
            // Refresh tables
            renderPendingLawyers();
            renderLawyerVerifyHistory();
        } else {
            alert(data.error || 'Failed to reject lawyer');
        }
    })
    .catch(err => console.error(err));
}

function approveLawyer(id) {
    if(!confirm('ยืนยันการอนุมัติทนายความท่านนี้?')) return;
    
    fetch('/admin/lawyers/' + id + '/approve', {
        method: 'PUT',
        headers: getAuthHeaders()
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            renderPendingLawyers();
            renderLawyerVerifyHistory();
        } else {
            alert(data.error || 'Failed to approve lawyer');
        }
    })
    .catch(err => console.error(err));
}

