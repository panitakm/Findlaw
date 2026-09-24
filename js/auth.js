const Auth = {

    TOKEN_KEY: 'auth_token',
    USER_KEY: 'auth_user',

    // บันทึก Token เมื่อ Login สำเร็จ
    setSession(token, user) {
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    },

    // ลบ Token เมื่อ Logout
    clearSession() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        window.location.href = '/';
    },

    // ดึง Token
    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    },

    // ตรวจสอบว่าเข้าระบบอยู่หรือไม่
    isAuthenticated() {
        return !!this.getToken();
    },

    // ดึงข้อมูลผู้ใช้ที่ Login (Role, ID, Name)
    getUser() {
        try {
            return JSON.parse(localStorage.getItem(this.USER_KEY));
        } catch (e) {
            return null;
        }
    },

    // เช็คสิทธิ์ (Guard) สำหรับป้องกันการเข้าถึงหน้าเว็บที่ไม่ได้รับอนุญาต
    guardPage(allowedRoles = []) {
        if (!this.isAuthenticated()) {
            window.location.href = '/sign_in';
            return false;
        }

        const user = this.getUser();
        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
            window.showBSAlert('ปฏิเสธการเข้าถึง', 'คุณไม่มีสิทธิ์เข้าใช้งานหน้านี้', 'error').then(() => {
                window.location.href = '/';
            });
            return false;
        }
        return true;
    },

    updateNavbar() {
        const navRightSection = document.getElementById('navRightSection');
        if (!navRightSection) return; 

        if (this.isAuthenticated()) {
            const user = this.getUser();
            let profileDropdown = `
                <style>
                    .dropdown-menu .dropdown-item:active {
                        background-color: #e9ecef !important;
                        color: #1e2125 !important;
                    }
                </style>
                <div class="dropdown">
                    <a href="#" class="d-flex align-items-center link-dark text-decoration-none" data-bs-toggle="dropdown" aria-expanded="false">
                        ${user.image_path 
                            ? `<img src="${user.image_path}" alt="Profile" width="38" height="38" class="rounded-circle shadow-sm border border-2 border-white" style="object-fit: cover;">`
                            : `<div class="d-flex justify-content-center align-items-center bg-light rounded-circle shadow-sm border border-2 border-white" style="width: 38px; height: 38px;"><i class="fa-solid fa-user" style="font-size: 20px; color: #dee2e6;"></i></div>`
                        }
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end shadow-lg border-0 rounded-4 p-2 mt-2 fade-in" style="min-width: 220px;">`;

            let settingsHref = '/profile';
            if (user.role === 'admin') settingsHref = '/admin_dashboard';
            else if (user.role === 'lawyer') settingsHref = '/lawyer_dashboard';
            
            profileDropdown += `<li><a class="dropdown-item rounded-3 px-3 py-2 mt-1 text-dark d-flex align-items-center" href='${settingsHref}'><i class="fa-solid fa-gear text-muted me-3" style="width: 16px; text-align: center; font-size: 0.9rem;"></i>ตั้งค่า</a></li>`;

            profileDropdown += `
                        <li><hr class="dropdown-divider my-1 mx-2"></li>
                        <li><a class="dropdown-item rounded-3 px-3 py-2 text-dark d-flex align-items-center" href="#" onclick="Auth.clearSession()"><i class="fa-solid fa-arrow-right-from-bracket text-muted me-3" style="width: 16px; text-align: center; font-size: 0.9rem;"></i>ออกจากระบบ</a></li>
                    </ul>
                </div>
            `;
            navRightSection.innerHTML = profileDropdown;
        } else {
            navRightSection.innerHTML = `
                <div class="d-none d-md-flex gap-2">
                    <a href='/sign_up' class="btn btn-register rounded-pill-custom px-4 btn-glow">สมัครใช้งาน</a>
                    <a href='/sign_in' class="btn btn-login rounded-pill-custom px-4 btn-glow">เข้าสู่ระบบ</a>
                </div>
                <div class="dropdown d-md-none">
                    <button class="btn btn-outline-dark dropdown-toggle p-2" type="button" data-bs-toggle="dropdown" aria-expanded="false" style="border-radius: 12px;">
                        <i class="fa-solid fa-list fs-5"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end shadow border-0 rounded-4 mt-2">
                        <li><a class="dropdown-item py-2 fw-medium" href='/sign_up'>สมัครใช้งาน</a></li>
                        <li><a class="dropdown-item py-2 fw-medium" href='/sign_in'>เข้าสู่ระบบ</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item py-2 fw-medium" href='/lawyer_signup'>สำหรับทนายความ</a></li>
                    </ul>
                </div>
            `;
        }
    },

    updateHeaderProfile() {
        const headerUsername = document.getElementById('headerUsername');
        const headerPic = document.getElementById('headerPic');
        
        if (this.isAuthenticated()) {
            const user = this.getUser();
            if (headerUsername) {
                headerUsername.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim();
            }
            if (headerPic && user.image_path) {
                headerPic.src = user.image_path;
                headerPic.style.display = 'block';
            } else if (headerPic) {
                headerPic.style.display = 'none';
            }
        }
    },

    // ครอบปุ่มที่ต้องบังคับ Login (เช่น รีวิว, บันทึกทนาย)
    requireLoginAction(actionCallback) {
        if (!this.isAuthenticated()) {
            window.showBSConfirm('กรุณาเข้าสู่ระบบ', 'คุณต้องเข้าสู่ระบบก่อนจึงจะสามารถทำรายการนี้ได้', 'ไปหน้าเข้าสู่ระบบ').then((confirmed) => {
                if (confirmed) {
                    window.location.href = '/sign_in';
                }
            });
            return false;
        }
        // ถ้าล็อกอินแล้ว ให้ทำ action นั้นได้เลย
        if (typeof actionCallback === 'function') actionCallback();
        return true;
    },

    async updateSidebarProfile() {
        if (!this.isAuthenticated()) return;
        let user = this.getUser();
        
        // Helper function to update DOM
        const renderSidebar = (userData) => {
            const sidebarUsername = document.getElementById('sidebarUsername');
            const sidebarEmail = document.getElementById('sidebarEmail');
            const sidebarPic = document.getElementById('sidebarPic');
            
            if (sidebarUsername) sidebarUsername.textContent = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'ผู้ใช้งาน';
            if (sidebarEmail) sidebarEmail.textContent = userData.email || 'ไม่มีอีเมล';
            if (sidebarPic && userData.image_path) {
                sidebarPic.src = userData.image_path;
                sidebarPic.style.display = 'block';
            } else if (sidebarPic) {
                sidebarPic.style.display = 'none';
            }
        };

        // 1. Instant update from cache (localStorage) to prevent UI delay
        renderSidebar(user);
        
        // 2. Fetch fresh data in the background
        try {
            const res = await fetch(`/users/${user.id}`);
            if (res.ok) {
                const freshData = await res.json();
                user = { ...user, ...freshData };
                localStorage.setItem(this.USER_KEY, JSON.stringify(user));
                
                // Update DOM again silently with fresh data
                renderSidebar(user);
            }
        } catch (e) {
            console.error("Failed to fetch fresh user profile for sidebar", e);
        }
    },

    setupSidebarImageUpload() {
        const fileInput = document.getElementById('uploadNewpic');
        const sidebarPic = document.getElementById('sidebarPic');
        
        if (fileInput && sidebarPic && this.isAuthenticated()) {
            fileInput.addEventListener('change', async (event) => {
                const file = event.target.files[0];
                if (!file) return;

                if (!file.type.match('image.*')) {
                    if (typeof window.showBSAlert === 'function') {
                        window.showBSAlert('ข้อผิดพลาด', 'กรุณาเลือกไฟล์รูปภาพเท่านั้น (jpeg, png)', 'error');
                    } else {
                        alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น (jpeg, png)');
                    }
                    return; 
                }

                // Show loading state on image
                sidebarPic.style.opacity = '0.5';

                const reader = new FileReader();
                reader.onload = async (e) => {
                    const base64Image = e.target.result;
                    const user = this.getUser();

                    try {
                        const response = await fetch(`/users/update/${user.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                first_name: user.first_name,
                                last_name: user.last_name,
                                email: user.email,
                                phone: user.phone,
                                image_path: base64Image
                            })
                        });

                        if (response.ok) {
                            sidebarPic.src = base64Image;
                            sidebarPic.style.display = 'block';
                            // Update local storage user
                            user.image_path = base64Image;
                            localStorage.setItem(this.USER_KEY, JSON.stringify(user));
                            
                            this.updateHeaderProfile(); // update top right navbar if exists
                            
                            if (typeof window.showBSToast === 'function') {
                                window.showBSToast('เปลี่ยนรูปโปรไฟล์สำเร็จ', 'success');
                            }
                        } else {
                            throw new Error("Failed to upload image");
                        }
                    } catch (err) {
                        console.error("Error auto-saving image:", err);
                        if (typeof window.showBSAlert === 'function') {
                            window.showBSAlert('ข้อผิดพลาด', 'ไม่สามารถบันทึกรูปโปรไฟล์ได้', 'error');
                        }
                    } finally {
                        sidebarPic.style.opacity = '1';
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    }
};

// อัปเดต Navbar ทันทีเมื่อโหลดไฟล์นี้ (ถ้าหน้าโหลดเสร็จแล้ว)
document.addEventListener('DOMContentLoaded', () => {
    // Inject Bootstrap 5 Utilities (Modals & Toasts) to replace SweetAlert2
    if (!document.getElementById('bs-toast-container')) {
        const toastContainer = document.createElement('div');
        toastContainer.id = 'bs-toast-container';
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '1080';
        document.body.appendChild(toastContainer);
    }

    if (!document.getElementById('bs-alert-modal')) {
        const alertModal = document.createElement('div');
        alertModal.id = 'bs-alert-modal';
        alertModal.className = 'modal fade';
        alertModal.tabIndex = '-1';
        alertModal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg rounded-4 p-4 text-center">
                    <div class="d-flex justify-content-center mb-3">
                        <div id="bs-alert-icon-bg" class="d-inline-flex justify-content-center align-items-center" style="display: none;">
                            <i id="bs-alert-icon" class="fs-1" style="font-size: 3rem !important;"></i>
                        </div>
                    </div>
                    <h4 class="fw-bold text-dark mb-2" id="bs-alert-title"></h4>
                    <p class="text-muted mb-4 fs-6 px-2" id="bs-alert-text"></p>
                    <div class="d-flex justify-content-center" id="bs-alert-btn-wrapper">
                        <button type="button" class="btn btn-primary flex-grow-1 rounded-3 py-2 fw-bold" data-bs-dismiss="modal" id="bs-alert-btn">ตกลง</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(alertModal);
    }

    if (!document.getElementById('bs-confirm-modal')) {
        const confirmModal = document.createElement('div');
        confirmModal.id = 'bs-confirm-modal';
        confirmModal.className = 'modal fade';
        confirmModal.tabIndex = '-1';
        confirmModal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg rounded-4 p-4 text-center">
                    <div class="d-flex justify-content-center mb-3">
                        <div id="bs-confirm-icon-bg" class="d-inline-flex justify-content-center align-items-center">
                            <i id="bs-confirm-icon" class="fa-solid fa-triangle-exclamation text-danger" style="font-size: 3rem !important;"></i>
                        </div>
                    </div>
                    <h4 class="fw-bold text-dark mb-2" id="bs-confirm-title"></h4>
                    <p class="text-muted mb-4 fs-6 px-2" id="bs-confirm-text"></p>
                    <div class="d-flex justify-content-center gap-3">
                        <button type="button" class="btn flex-grow-1 rounded-3 py-2 fw-bold text-secondary" style="background-color: #f3f4f6; border: none;" data-bs-dismiss="modal" id="bs-confirm-cancel-btn"></button>
                        <button type="button" class="btn flex-grow-1 rounded-3 py-2 fw-bold text-white" id="bs-confirm-ok-btn"></button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(confirmModal);
    }

    Auth.updateNavbar();
    Auth.updateHeaderProfile();
    Auth.updateSidebarProfile();
    Auth.setupSidebarImageUpload();
});

// UI Utility Functions
window.showBSAlert = function(title, text, icon = 'info', options = {}) {
    return Swal.fire({
        title: title,
        html: text,
        icon: icon,
        showConfirmButton: options.showConfirmButton !== false,
        timer: options.timer || undefined,
        confirmButtonColor: '#4987A4'
    });
};

window.showBSConfirm = function(title, text, confirmText = 'ตกลง', cancelText = 'ยกเลิก', confirmColor = 'btn-primary') {
    let confirmBtnColor = '#4987A4';
    if (confirmColor.includes('danger')) confirmBtnColor = '#dc3545';
    else if (confirmColor.includes('success')) confirmBtnColor = '#198754';
    else if (confirmColor.includes('warning')) confirmBtnColor = '#ffc107';

    return Swal.fire({
        title: title,
        html: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: confirmBtnColor,
        cancelButtonColor: '#6c757d',
        confirmButtonText: confirmText,
        cancelButtonText: cancelText
    }).then((result) => {
        return result.isConfirmed;
    });
};

window.showBSToast = function(message, type = 'success') {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.onmouseenter = Swal.stopTimer;
            toast.onmouseleave = Swal.resumeTimer;
        }
    });
    Toast.fire({
        icon: type === 'error' ? 'error' : 'success',
        title: message
    });
};

window.showBSLoading = function(title = 'กำลังดำเนินการ...') {
    Swal.fire({
        title: title,
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    return () => {
        Swal.close();
    };
};

// Global focus outline removal and alert button styling
document.addEventListener('DOMContentLoaded', () => {
    const globalStyle = document.createElement('style');
    globalStyle.innerHTML = `
        .form-control:focus, .form-select:focus, .btn:focus, .btn:active:focus, 
        a:focus, button:focus, input:focus, textarea:focus {
            box-shadow: none !important;
            outline: none !important;
        }
        
        #bs-alert-btn, #bs-confirm-ok-btn {
            background-color: #4987A4 !important;
            border-color: #4987A4 !important;
            color: #ffffff !important;
        }
        
        #bs-alert-btn:hover, #bs-confirm-ok-btn:hover {
            background-color: #3b718c !important;
            border-color: #3b718c !important;
        }
    `;
    document.head.appendChild(globalStyle);
});

// =========================================
// Responsive Sidebar Injection
// =========================================
document.addEventListener("DOMContentLoaded", function () {
    const sidebar = document.querySelector(".sidebar-curved");
    const header = document.querySelector(".user-header-bar");

    if (sidebar && header) {
        // Create Hamburger Button
        const hamburgerBtn = document.createElement("button");
        hamburgerBtn.className = "btn btn-light d-md-none me-3";
        hamburgerBtn.innerHTML = "<i class=\"fa-solid fa-bars fs-5\"></i>";
        hamburgerBtn.style.border = "1px solid #dee2e6";
        hamburgerBtn.style.color = "#1A435A";
        
        // Find the title div (first child of header)
        const titleDiv = header.firstElementChild;
        if (titleDiv) {
            // Un-hide the title on mobile for better UX
            titleDiv.classList.remove("d-none");
            titleDiv.classList.add("d-flex", "align-items-center");
            titleDiv.prepend(hamburgerBtn);
        } else {
            header.prepend(hamburgerBtn);
        }

        // Create Backdrop
        const backdrop = document.createElement("div");
        backdrop.className = "sidebar-backdrop";
        document.body.appendChild(backdrop);

        // Toggle logic
        const toggleSidebar = () => {
            sidebar.classList.toggle("show");
            backdrop.classList.toggle("show");
        };

        hamburgerBtn.addEventListener("click", toggleSidebar);
        backdrop.addEventListener("click", toggleSidebar);
    }
});

