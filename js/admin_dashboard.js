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
    pageTitleHeader.textContent = 'การจัดการผู้ใช้งาน';

    // 2. Initial Render
    // renderOverviewDashboard(); // Overview section removed
    renderUsers();
    renderPendingLawyers();
    renderReviews();

    // 3. User Form Submit
    document.getElementById('userForm').addEventListener('submit', handleUserSubmit);

    // 4. Reject Lawyer Form Submit
    document.getElementById('rejectLawyerForm').addEventListener('submit', handleRejectLawyerSubmit);
});

// ==========================================
// User Management Logic
// ==========================================

function renderUsers() {
    fetch('/admin/users', { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
            users = data;
            filterUsers();
        })
        .catch(err => console.error(err));
}

function filterUsers() {
    const filterEl = document.getElementById('roleFilter');
    const selectedFilter = filterEl ? filterEl.value : 'all';

    let filteredUsers = users;
    if (selectedFilter !== 'all') {
        filteredUsers = users.filter(u => {
            const role = (u.role || '').toLowerCase();
            if (selectedFilter === 'user') return role === 'client' || role === 'user';
            return role === selectedFilter;
        });
    }

    displayUsers(filteredUsers);
}

function displayUsers(userList) {
    const renderTable = (list, tbodyId) => {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        if (list.length === 0) {
            let cols = 5;
            if (tbodyId === 'suspendedUserTableBody') cols = 6;
            else if (tbodyId === 'deletedUserTableBody') cols = 4;

            tbody.innerHTML = `<tr><td colspan="${cols}" class="text-center py-5 text-muted">
                ไม่พบข้อมูลผู้ใช้งาน
            </td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(u => {
            let roleColor = 'bg-secondary';
            const role = (u.role || '').toLowerCase();
            if (role === 'admin') roleColor = 'bg-dark text-white';
            else if (role === 'lawyer') roleColor = 'badge-role-lawyer';
            else if (role === 'client' || role === 'user') roleColor = 'badge-role-user';

            let statusHtml = '';
            if (u.user_status === 'deleted') {
                statusHtml = `<span class="badge-status badge-deleted" style="background-color: #f8d7da; color: #842029;">ถูกลบ</span>`;
            } else if (u.user_status === 'suspended') {
                statusHtml = `<span class="badge-status badge-suspended">ระงับ</span>`;
            } else if (u.user_status === 'pending' || (role === 'lawyer' && u.lawyer_status === 'pending')) {
                statusHtml = `<span class="badge-status badge-pending">รอตรวจสอบ</span>`;
            } else {
                statusHtml = `<span class="badge-status badge-active">ใช้งาน</span>`;
            }

            let actionHtml = '';
            if (tbodyId === 'deletedUserTableBody') {
                actionHtml = '';
            } else if (tbodyId === 'suspendedUserTableBody') {
                actionHtml = `
                <td>${u.suspend_reason || '-'}</td>
                <td class="text-center">
                    <div class="d-flex justify-content-center gap-4">
                        <i class="fa-solid fa-rotate-left text-success" style="cursor: pointer; font-size: 1.1rem; transition: opacity 0.2s;" onclick="restoreUser(${u.id})" title="ยกเลิกระงับบัญชี" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'"></i>
                    </div>
                </td>
                `;
            } else {
                actionHtml = `
                <td class="text-center">
                    <div class="d-flex justify-content-center gap-4">
                        <i class="fa-solid fa-ban text-dark" style="cursor: pointer; font-size: 1.1rem; transition: opacity 0.2s;" onclick="suspendUser(${u.id})" title="ระงับการใช้งาน" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'"></i>
                        <i class="fa-solid fa-trash text-danger" style="cursor: pointer; font-size: 1.1rem; transition: opacity 0.2s;" onclick="deleteUser(${u.id})" title="ลบบัญชี" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'"></i>
                    </div>
                </td>
                `;
            }

            return `
            <tr>
                <td>${u.first_name} ${u.last_name}</td>
                <td>${u.email}</td>
                <td class="text-center"><span class="badge-status ${roleColor}">${(u.role || '').toUpperCase()}</span></td>
                <td class="text-center">
                    ${statusHtml}
                </td>
                ${actionHtml}
            </tr>
            `;
        }).join('');
    };

    const activeList = userList.filter(u => u.user_status !== 'suspended' && u.user_status !== 'deleted');
    const suspendedList = userList.filter(u => u.user_status === 'suspended');
    const deletedList = userList.filter(u => u.user_status === 'deleted');

    renderTable(activeList, 'userTableBody');
    renderTable(suspendedList, 'suspendedUserTableBody');
    renderTable(deletedList, 'deletedUserTableBody');
}

let userModal;
function openUserModal(id = null) {
    const modalEl = document.getElementById('userModal');
    if (!userModal) userModal = new bootstrap.Modal(modalEl);

    const form = document.getElementById('userForm');
    form.reset();
    document.getElementById('userId').value = '';

    if (id) {
        document.getElementById('userModalTitle').textContent = 'จัดการผู้ใช้งาน';
        document.getElementById('passwordGroup').style.display = 'none';
        document.getElementById('userPasswordInput').required = false;
        const user = users.find(u => u.id === id);
        if (user) {
            document.getElementById('userId').value = user.id;
            document.getElementById('userNameInput').value = `${user.first_name || ''} ${user.last_name || ''}`;
            document.getElementById('userNameInput').readOnly = true;
            document.getElementById('userEmailInput').value = user.email;
            document.getElementById('userEmailInput').readOnly = true;
            document.getElementById('userRoleInput').value = user.role;
            let currentStatus = user.user_status || 'active';
            if (currentStatus !== 'suspended' && user.role === 'lawyer' && user.lawyer_status === 'pending') {
                currentStatus = 'pending';
            }
            document.getElementById('userStatusInput').value = currentStatus;
        }
    } else {
        document.getElementById('userModalTitle').textContent = 'เพิ่มผู้ใช้ใหม่';
        document.getElementById('passwordGroup').style.display = 'block';
        document.getElementById('userPasswordInput').required = true;
        document.getElementById('userNameInput').readOnly = false;
        document.getElementById('userEmailInput').readOnly = false;
    }

    userModal.show();
}

async function deleteUser(id) {
    const confirmed = await window.showBSConfirm("ยืนยันการลบ", "คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีนี้ออกจากระบบ?", "ลบบัญชี", "ยกเลิก", "btn-danger");
    if (confirmed) {
        fetch('/admin/users/' + id, { headers: getAuthHeaders(), method: 'DELETE' })
            .then(() => renderUsers())
            .catch(err => console.error(err));
    }
}

let suspendUserModalInstance;

function suspendUser(id) {
    document.getElementById('suspendUserId').value = id;
    document.getElementById('suspendReasonSelect').value = '';
    const otherReasonInput = document.getElementById('suspendReason');
    otherReasonInput.value = '';
    otherReasonInput.classList.add('d-none');
    otherReasonInput.required = false;
    
    if (!suspendUserModalInstance) {
        suspendUserModalInstance = new bootstrap.Modal(document.getElementById('suspendUserModal'));
    }
    suspendUserModalInstance.show();
}

document.addEventListener('DOMContentLoaded', () => {
    const suspendForm = document.getElementById('suspendUserForm');
    if (suspendForm) {
        suspendForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const id = document.getElementById('suspendUserId').value;
            const selectedReason = document.getElementById('suspendReasonSelect').value;
            const otherReason = document.getElementById('suspendReason').value;
            const finalReason = selectedReason === 'อื่นๆ' ? otherReason : selectedReason;

            fetch('/admin/users/' + id + '/suspend', { 
                headers: getAuthHeaders(), 
                method: 'PUT',
                body: JSON.stringify({ reason: finalReason })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    if (suspendUserModalInstance) suspendUserModalInstance.hide();
                    window.showBSToast('ระงับบัญชีผู้ใช้สำเร็จ', 'success');
                    renderUsers();
                } else {
                    window.showBSAlert('เกิดข้อผิดพลาด!', data.error || 'ไม่สามารถระงับบัญชีได้', 'error');
                }
            })
            .catch(err => console.error(err));
        });
    }
});

async function restoreUser(id) {
    const confirmed = await window.showBSConfirm("ยืนยันการกู้คืน", "คุณแน่ใจหรือไม่ว่าต้องการกู้คืนบัญชีผู้ใช้นี้กลับมาใช้งาน?", "กู้คืน", "ยกเลิก", "btn-success");
    if (confirmed) {
        fetch('/admin/users/' + id + '/restore', { headers: getAuthHeaders(), method: 'PUT' })
            .then(() => renderUsers())
            .catch(err => console.error(err));
    }
}

function handleUserSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('userId').value;
    const email = document.getElementById('userEmailInput').value;
    const role = document.getElementById('userRoleInput').value;
    const status = document.getElementById('userStatusInput').value;
    const password = document.getElementById('userPasswordInput').value;
    
    let nameParts = document.getElementById('userNameInput').value.trim().split(/\s+/);
    let first_name = nameParts[0] || '';
    let last_name = nameParts.slice(1).join(' ') || '';

    if (id) {
        const user = users.find(u => u.id == id);
        fetch('/admin/users/' + id, {
            headers: getAuthHeaders(),
            method: 'PUT',
            body: JSON.stringify({
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role,
                status
            })
        }).then(() => renderUsers()).catch(err => console.error(err));
    } else {
        fetch('/admin/users', {
            headers: getAuthHeaders(),
            method: 'POST',
            body: JSON.stringify({
                first_name,
                last_name,
                email,
                role,
                status,
                password
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                window.showBSToast('เพิ่มผู้ใช้สำเร็จ', 'success');
                renderUsers();
            } else {
                window.showBSAlert('เกิดข้อผิดพลาด!', data.error || 'ไม่สามารถเพิ่มผู้ใช้ได้', 'error');
            }
        })
        .catch(err => console.error(err));
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

            // 1. รอตรวจสอบ (Pending)
            const verifyTbody = document.getElementById('lawyerVerifyTableBody');
            if (pendingLawyers.length === 0) {
                verifyTbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">ไม่มีคำร้องขอที่รอตรวจสอบ</td></tr>`;
            } else {
                verifyTbody.innerHTML = pendingLawyers.map((l) => {
                    const dateObj = new Date(l.created_at);
                    const thaiDate = dateObj.toLocaleDateString('th-TH');
                    return `
                    <tr>
                        <td>${thaiDate}</td>
                        <td>${l.name}</td>
                        <td>${l.license}</td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-outline-admin rounded-pill px-3 shadow-sm" onclick="openLawyerDetailModal(${l.id})" title="ดูรายละเอียด">
                                ดูรายละเอียด
                            </button>
                        </td>
                    </tr>
                    `;
                }).join('');
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

            const rejectedLawyers = lawyerVerifyHistory.filter(l => l.status === 'rejected');
            const approvedLawyers = lawyerVerifyHistory.filter(l => l.status === 'approved');

            // 2. รอแก้ไข (Rejected)
            const editTbody = document.getElementById('lawyerPendingEditTableBody');
            if (rejectedLawyers.length === 0) {
                editTbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">ไม่มีคำร้องขอที่รอแก้ไข</td></tr>`;
            } else {
                editTbody.innerHTML = rejectedLawyers.map((l) => {
                    const dateObj = new Date(l.created_at);
                    const thaiDate = dateObj.toLocaleDateString('th-TH');
                    return `
                    <tr>
                        <td>${thaiDate}</td>
                        <td>${l.name}</td>
                        <td>${l.license}</td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-outline-admin rounded-pill px-3 shadow-sm" onclick="openLawyerDetailModal(${l.id}, true)" title="ดูรายละเอียด">
                                ดูรายละเอียด
                            </button>
                        </td>
                    </tr>
                    `;
                }).join('');
            }

            // 3. อนุมัติแล้ว (Approved)
            const tbody = document.getElementById('lawyerHistoryTableBody');
            if (approvedLawyers.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">ยังไม่มีประวัติการอนุมัติ</td></tr>`;
            } else {
                tbody.innerHTML = approvedLawyers.map(l => {
                    const dateObj = new Date(l.created_at);
                    const thaiDate = dateObj.toLocaleDateString('th-TH');
                    return `
                    <tr>
                        <td>${thaiDate}</td>
                        <td>${l.name}</td>
                        <td>${l.license}</td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-outline-admin rounded-pill px-3 shadow-sm" onclick="openLawyerDetailModal(${l.id}, true)" title="ดูรายละเอียด">
                                ดูรายละเอียด
                            </button>
                        </td>
                    </tr>
                    `;
                }).join('');
            }
        })
        .catch(err => console.error(err));
}

let detailModal;
async function openLawyerDetailModal(lawyerId, isReadOnly = false) {
    if (!detailModal) {
        detailModal = new bootstrap.Modal(document.getElementById('lawyerDetailModal'));
    }
    document.getElementById('detailLawyerId').value = lawyerId;

    const modalFooter = document.getElementById('lawyerDetailModalFooter');
    if (isReadOnly) {
        if (modalFooter) modalFooter.style.display = 'none';
    } else {
        if (modalFooter) modalFooter.style.display = 'flex';
    }

    try {
        const res = await fetch(`/lawyers/${lawyerId}/edit`);
        if (!res.ok) throw new Error('Failed to fetch lawyer details');
        const data = await res.json();

        const p = data.profile;
        const detailImg = document.getElementById('detailProfileImg');
        if (p.image_path) {
            detailImg.src = p.image_path;
            detailImg.style.display = 'block';
        } else {
            detailImg.removeAttribute('src');
            detailImg.style.display = 'none';
        }
        const setElemText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        setElemText('detailFirstName', p.first_name || '-');
        setElemText('detailLastName', p.last_name || '-');
        setElemText('detailPhone', p.phone || '-');
        setElemText('detailEmail', p.email || '-');
        setElemText('detailLine', p.line_id || '-');
        setElemText('detailFacebook', p.facebook_url || '-');
        setElemText('detailLicenseNumber', p.license_number || '-');
        setElemText('detailFeeRate', p.fee_rate ? p.fee_rate.toLocaleString() : '-');

        // Handle License Document
        const fileExt = p.license_file ? p.license_file.split('.').pop().toLowerCase() : '';
        const licenseEl = document.getElementById('detailLicenseFile');
        if (licenseEl) {
            if (p.license_file) {
                const fileName = p.license_file.split('/').pop() || 'ดูใบอนุญาต';
                licenseEl.innerHTML = `<a href="${p.license_file}" target="_blank" class="detail-value">${fileName}</a>`;
            } else {
                licenseEl.innerHTML = '<span class="text-muted small">- ไม่มีข้อมูล -</span>';
            }
        }

        // Fetch Provinces for Province Name
        const provRes = await fetch('/lawyer/provinces');
        let provName = '';
        if (provRes.ok) {
            const provinces = await provRes.json();
            const province = provinces.find(pr => pr.id == p.province_id);
            if (province) provName = province.name_th;
        }

        // Only append province if it is not already in the address text
        let fullAddress = p.office_address || '-';

        if (fullAddress !== '-') {
            // เอาคำนำหน้าออกตามที่ผู้ใช้ต้องการ
            fullAddress = fullAddress
                .replace(/บ้านเลขที่\s*/g, '')
                .replace(/เลขที่\s*/g, '')
                .replace(/(?:ตำบล|แขวง)\s*\/?\s*/g, '')
                .replace(/(?:อำเภอ|เขต)\s*\/?\s*/g, '')
                .replace(/(?:จังหวัด)\s*\/?\s*/g, '')
                .replace(/ต\.\s*|อ\.\s*|จ\.\s*/g, '');

            // ลบช่องว่างและเครื่องหมาย / ที่อาจหลงเหลือจากการพิมพ์ (ที่ไม่ใช่บ้านเลขที่)
            fullAddress = fullAddress.replace(/\s+\/\s+/g, ' ').replace(/\s+/g, ' ').trim();
        }

        if (provName && fullAddress !== '-' && !fullAddress.includes(provName)) {
            fullAddress += ` ${provName}`; // ไม่ต้องมีคำว่า จ.
        } else if (provName && fullAddress === '-') {
            fullAddress = provName;
        }

        const addressEl = document.getElementById('detailAddress');
        if (addressEl) addressEl.textContent = fullAddress;

        const feeRateEl = document.getElementById('detailFeeRate');
        if (feeRateEl) feeRateEl.textContent = p.fee_rate ? p.fee_rate.toLocaleString() : '-';

        // Specialties
        const specContainer = document.getElementById('detailSpecialties');
        if (data.specialties && data.specialties.length > 0) {
            specContainer.innerHTML = data.specialties.map(s => `<span class="badge rounded-pill px-3 py-2" style="background-color: #ddebf0; color: #1A435A; font-weight: 600;">${s.name}</span>`).join('');
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
        if (schedContainer) {
            if (data.schedules && data.schedules.length > 0) {
                schedContainer.innerHTML = data.schedules.map(s => {
                    if (s.is_open) {
                        return `<div class="d-flex justify-content-between mb-3">
                            <span style="color: #1A435A;">วัน${daysMap[s.day_of_week] || ''}</span>
                            <span style="color: #1A435A;">${s.time_start ? s.time_start.slice(0, 5) : ''} - ${s.time_end ? s.time_end.slice(0, 5) : ''}</span>
                        </div>`;
                    } else {
                        return `<div class="d-flex justify-content-between mb-3">
                            <span style="color: #1A435A;">วัน${daysMap[s.day_of_week] || ''}</span>
                            <span class="text-danger">ปิดทำการ</span>
                        </div>`;
                    }
                }).join('');
            } else {
                schedContainer.innerHTML = '<span class="text-muted">- ไม่มีข้อมูล -</span>';
            }
        }

        // Educations
        const eduContainer = document.getElementById('detailEducations');
        if (eduContainer) {
            if (data.educations && data.educations.length > 0) {
                eduContainer.innerHTML = data.educations.map(e => `
                    <div class="mb-3 position-relative ms-2">
                        <div class="position-absolute rounded-circle" style="background-color: #4987A4; width: 6px; height: 6px; left: -15px; top: 9px;"></div>
                        <span style="color: #1A435A; font-weight: 700; font-size: 0.95rem;">${e.degree}</span> 
                        <span style="color: #1A435A; font-size: 0.95rem;">- ${e.university}</span> 
                        <span class="text-muted" style="font-size: 0.9rem;">(${e.year_start} - ${e.year_end || 'ปัจจุบัน'})</span>
                    </div>
                `).join('');
            } else {
                eduContainer.innerHTML = '<p class="text-muted fst-italic mb-0">- ไม่มีข้อมูล -</p>';
            }
        }

        // Works
        const workContainer = document.getElementById('detailWorks');
        if (workContainer) {
            if (data.works && data.works.length > 0) {
                workContainer.innerHTML = data.works.map(w => `
                    <div class="mb-3 position-relative ms-2">
                        <div class="position-absolute rounded-circle" style="background-color: #4987A4; width: 6px; height: 6px; left: -15px; top: 9px;"></div>
                        <span style="color: #1A435A; font-weight: 700; font-size: 0.95rem;">${w.job_position}</span> 
                        <span style="color: #1A435A; font-size: 0.95rem;">- ${w.company_name}</span> 
                        <span class="text-muted" style="font-size: 0.9rem;">(${w.year_start} - ${w.year_end || 'ปัจจุบัน'})</span>
                    </div>
                `).join('');
            } else {
                workContainer.innerHTML = '<p class="text-muted fst-italic mb-0">- ไม่มีข้อมูล -</p>';
            }
        }

        detailModal.show();
    } catch (err) {
        console.error(err);
        await window.showBSAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการโหลดข้อมูลทนายความ', 'error');
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


let reviewHistory = [];

async function reportReview(id) {
    fetch('/admin/reviews/' + id + '/report', { headers: getAuthHeaders(), method: 'PUT' })
        .then(() => renderReviews())
        .catch(err => console.error(err));
}

function renderReviews() {
    // 1. Fetch reported reviews (Wait for review)
    fetch('/admin/reviews/reported', { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
            reportedReviews = data;
            const tbody = document.getElementById('reviewTableBody');
            if (reportedReviews.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">
                    ไม่มีข้อมูลรีวิวรอตรวจสอบ
                </td></tr>`;
            } else {
                tbody.innerHTML = reportedReviews.map((r, index) => {
                    let starsHtml = '';
                    for (let i = 1; i <= 5; i++) {
                        starsHtml += i <= r.rating ? '<i class="fa-solid fa-star text-warning"></i>' : '<i class="fa-regular fa-star text-muted opacity-25"></i>';
                    }

                    // Column 1
                    let usersCol = `
                        <div class="mb-1 fw-semibold" style="color: #1A435A; font-size: 1.05rem;">${r.reviewer}</div>
                        <div class="d-flex flex-wrap align-items-center gap-2 text-muted" style="font-size: 0.95rem;">
                            <i class="fa-solid fa-reply fa-rotate-180" style="color: #1A435A; margin-top: -3px;"></i>
                            <span class="fw-medium">${r.lawyer}</span>
                        </div>
                    `;

                    // Column 2
                    let rawReviewText = (r.text === null || r.text.trim() === '' || r.text === 'null')
                        ? '<span class="text-muted fst-italic">- ไม่มีข้อความรีวิว -</span>'
                        : `"${r.text}"`;
                    let reviewTextHtml = `
                        <div class="mb-1">${starsHtml}</div>
                        <div>${rawReviewText}</div>
                    `;

                    if (r.reply && r.reply.trim() !== '') {
                        reviewTextHtml += `
                        <div class="rounded-3 p-2 mt-3" style="background-color: #f8f9fa; border: 1px solid #4987AA; font-size: 0.9em;">
                            <i class="fa-solid fa-reply fa-rotate-180 me-1" style="color: #1A435A"></i><strong>ตอบกลับ: </strong>${r.reply}
                        </div>`;
                    }

                    // Column 3
                    let cleanReason = '- ไม่มีหมายเหตุ -';
                    if (r.flagReason && r.flagReason.trim() !== '') {
                        cleanReason = r.flagReason.replace(/\[รีพอร์ตรีวิว\]\s*/g, '').replace(/\[รีพอร์ตการตอบกลับ\]\s*/g, '');
                    }
                    let reportCol = `
                        <div class="mb-1 fw-semibold">ผู้รายงาน: <span class="fw-normal" style="color: #1A435A;">${r.reporter || 'ไม่ระบุ'}</span></div>
                        <div class="fw-semibold">สาเหตุ: <span class="fw-normal" style="color: #1A435A;">${cleanReason}</span></div>
                    `;

                    // Action column
                    let actionHtml = `
                    <div class="dropdown">
                        <button class="btn btn-sm bg-white border border-secondary-subtle rounded-3 dropdown-toggle px-2 py-1 d-flex justify-content-between align-items-center w-100" type="button" data-bs-toggle="dropdown" aria-expanded="false" style="color: #1A435A;">
                            <span class="text-truncate fw-medium">รอตรวจสอบ</span>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0" style="border-radius: 8px; font-size: 0.9rem;">
                            <li><a class="dropdown-item py-2 fw-medium" style="color: #1A435A;" href="#" onclick="approveReview(${r.id}); return false;">อนุมัติ</a></li>
                            <li><a class="dropdown-item py-2 fw-medium" style="color: #1A435A;" href="#" onclick="reportReview(${r.id}); return false;">รอตรวจสอบ</a></li>
                            <li><a class="dropdown-item py-2 fw-medium" style="color: #1A435A;" href="#" onclick="deleteReview(${r.id}); return false;">ลบ</a></li>
                        </ul>
                    </div>`;

                    return `
                    <tr>
                        <td class="align-top py-3">${usersCol}</td>
                        <td class="align-top py-3">
                            <div class="text-break" title="${(r.text || '').replace(/"/g, '&quot;')}">${reviewTextHtml}</div>
                        </td>
                        <td class="align-top py-3">${reportCol}</td>
                        <td class="text-center align-top py-3">
                            <span class="badge bg-warning-subtle text-warning-emphasis px-2 py-2" style="font-size: 0.75rem; font-weight: 600;">รอตรวจสอบ</span>
                        </td>
                        <td class="text-center align-top py-3">
                            ${actionHtml}
                        </td>
                    </tr>
                `}).join('');
            }

            // 2. Fetch history reviews to populate the "Deleted" tab
            fetch('/admin/reviews/history', { headers: getAuthHeaders() })
                .then(res => res.json())
                .then(historyData => {
                    const deletedReviews = historyData.filter(r => r.status === 'hidden');
                    const deletedTbody = document.getElementById('deletedReviewTableBody');
                    if (deletedReviews.length === 0) {
                        deletedTbody.innerHTML = `<tr><td colspan="4" class="text-center py-5 text-muted">
                            ไม่มีข้อมูลรีวิวที่ถูกลบ
                        </td></tr>`;
                    } else {
                        deletedTbody.innerHTML = deletedReviews.map((r, index) => {
                            let starsHtml = '';
                            for (let i = 1; i <= 5; i++) {
                                starsHtml += i <= r.rating ? '<i class="fa-solid fa-star text-warning"></i>' : '<i class="fa-regular fa-star text-muted opacity-25"></i>';
                            }

                            // Column 1
                            let usersCol = `
                                <div class="mb-1 fw-semibold" style="color: #1A435A; font-size: 1.05rem;">${r.reviewer}</div>
                                <div class="d-flex flex-wrap align-items-center gap-2 text-muted" style="font-size: 0.95rem;">
                                    <i class="fa-solid fa-reply fa-flip-horizontal" style="color: #1A435A; margin-top: 2px;"></i>
                                    <span class="fw-medium">${r.lawyer}</span>
                                </div>
                            `;

                            // Column 2
                            let rawReviewText = (r.text === null || r.text.trim() === '' || r.text === 'null')
                                ? '<span class="text-muted fst-italic">- ไม่มีข้อความรีวิว -</span>'
                                : `"${r.text}"`;
                            let reviewTextHtml = `
                                <div class="mb-1">${starsHtml}</div>
                                <div>${rawReviewText}</div>
                            `;

                            if (r.reply && r.reply.trim() !== '') {
                                reviewTextHtml += `
                                <div class="rounded-3 p-2 mt-3" style="background-color: #f8f9fa; border: 1px solid #4987AA; font-size: 0.9em;">
                                    <i class="fa-solid fa-reply fa-rotate-180 me-1" style="color: #1A435A"></i><strong>ตอบกลับ: </strong>${r.reply}
                                </div>`;
                            }

                            // Column 3
                            let cleanReason = '- ไม่มีหมายเหตุ -';
                            if (r.flagReason && r.flagReason.trim() !== '') {
                                cleanReason = r.flagReason.replace(/\[รีพอร์ตรีวิว\]\s*/g, '').replace(/\[รีพอร์ตการตอบกลับ\]\s*/g, '');
                            }
                            let reportCol = `
                                <div class="mb-1 fw-semibold">ผู้รายงาน: <span class="fw-normal" style="color: #1A435A;">${r.reporter || 'ไม่ระบุ'}</span></div>
                                <div class="fw-semibold">สาเหตุ: <span class="fw-normal" style="color: #1A435A;">${cleanReason}</span></div>
                            `;

                            return `
                            <tr>
                                <td class="align-top py-3">${usersCol}</td>
                                <td class="align-top py-3">
                                    <div class="text-break" title="${(r.text || '').replace(/"/g, '&quot;')}">${reviewTextHtml}</div>
                                </td>
                                <td class="align-top py-3">${reportCol}</td>
                                <td class="text-center align-top py-3">
                                    <span class="badge bg-danger-subtle text-danger-emphasis px-2 py-2" style="font-size: 0.75rem; font-weight: 600;">ถูกลบ</span>
                                </td>
                            </tr>
                            `}).join('');
                    }
                })
                .catch(err => console.error(err));
        })
        .catch(err => console.error(err));

}

async function approveReview(id) {
    const confirmed = await window.showBSConfirm("ยืนยัน", "อนุมัติให้รีวิวนี้แสดงในหน้าโปรไฟล์ของทนายความหรือไม่?");
    if (confirmed) {
        fetch('/admin/reviews/' + id + '/approve', { headers: getAuthHeaders(), method: 'PUT' })
            .then(() => {
                renderReviews();
                window.showBSAlert('สำเร็จ', 'รีวิวได้รับการอนุมัติ', 'success');
            })
            .catch(err => console.error(err));
    }
}

async function deleteReview(id) {
    const confirmed = await window.showBSConfirm("แจ้งเตือน", "คุณแน่ใจหรือไม่ว่าต้องการลบรีวิวนี้?", "ลบ", "ยกเลิก", "btn-danger");
    if (confirmed) {
        fetch('/admin/reviews/' + id, { headers: getAuthHeaders(), method: 'DELETE' })
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
                window.showBSAlert('ข้อผิดพลาด', data.error || 'Failed to reject lawyer', 'error');
            }
        })
        .catch(err => console.error(err));
}

async function approveLawyer(id) {
    const confirmed = await window.showBSConfirm("ยืนยัน", "ยืนยันการอนุมัติทนายความท่านนี้?");
    if (!confirmed) return;

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
                window.showBSAlert('ข้อผิดพลาด', data.error || 'Failed to approve lawyer', 'error');
            }
        })
        .catch(err => console.error(err));
}

