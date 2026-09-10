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
        window.location.href = '/search.html';
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
            window.location.href = '/login.html';
            return false;
        }

        const user = this.getUser();
        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
            // ไม่มีสิทธิ์เข้าหน้านี้ (เช่น user ธรรมดาพยายามเข้าหน้า admin)
            Swal.fire({
                icon: 'error',
                title: 'ปฏิเสธการเข้าถึง',
                text: 'คุณไม่มีสิทธิ์เข้าใช้งานหน้านี้',
            }).then(() => {
                window.location.href = '/search.html';
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
                <div class="dropdown">
                    <a href="#" class="d-block link-dark text-decoration-none dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                        <img src="${user.image_path || '/css/pic/person-circle.svg'}" alt="Profile" width="38" height="38" class="rounded-circle shadow-sm border border-2 border-white" style="object-fit: cover;">
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end shadow-lg border-0 rounded-4 py-2 mt-2 fade-in">
                        <li class="px-4 py-2 border-bottom mb-2 bg-light bg-opacity-50">
                            <small class="fw-bold d-block text-dark" style="font-size: 0.95rem;">${user.first_name || 'ผู้ใช้งาน'}</small>
                            <small class="text-muted">${user.role}</small>
                        </li>`;

            if (user.role === 'admin') {
                profileDropdown += `<li><a class="dropdown-item px-4 py-2" href="/admin/adminDashboard.html"><i class="fa-solid fa-shield-halved text-primary me-3"></i>หลังบ้าน (Admin)</a></li>`;
            } else if (user.role === 'lawyer') {
                profileDropdown += `<li><a class="dropdown-item px-4 py-2" href="/lawyer/lawyerEdit.html"><i class="fa-solid fa-address-card text-primary me-3"></i>จัดการโปรไฟล์ทนาย</a></li>`;
            } else {
                profileDropdown += `<li><a class="dropdown-item px-4 py-2" href="/user/userProfile.html"><i class="fa-regular fa-user text-primary me-3"></i>โปรไฟล์ของฉัน</a></li>
                                    <li><a class="dropdown-item px-4 py-2" href="/user/favorites.html"><i class="fa-regular fa-bookmark text-danger me-3"></i>ทนายที่บันทึกไว้</a></li>`;
            }

            profileDropdown += `
                        <li><hr class="dropdown-divider my-2"></li>
                        <li><a class="dropdown-item px-4 py-2 text-danger fw-medium" href="#" onclick="Auth.clearSession()"><i class="fa-solid fa-right-from-bracket me-3"></i>ออกจากระบบ</a></li>
                    </ul>
                </div>
            `;
            navRightSection.innerHTML = profileDropdown;
        } else {
            navRightSection.innerHTML = `
                <div class="d-none d-md-flex gap-2">
                    <a href="/user/registerUser.html" class="btn btn-register rounded-pill-custom px-4 btn-glow">สมัครใช้งาน</a>
                    <a href="/login.html" class="btn btn-login rounded-pill-custom px-4 btn-glow">เข้าสู่ระบบ</a>
                </div>
                <div class="dropdown d-md-none">
                    <button class="btn btn-outline-dark dropdown-toggle p-2" type="button" data-bs-toggle="dropdown" aria-expanded="false" style="border-radius: 12px;">
                        <i class="fa-solid fa-list fs-5"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end shadow border-0 rounded-4 mt-2">
                        <li><a class="dropdown-item py-2 fw-medium" href="/user/registerUser.html">สมัครใช้งาน</a></li>
                        <li><a class="dropdown-item py-2 fw-medium" href="/login.html">เข้าสู่ระบบ</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item py-2 fw-medium" href="/lawyer/registerLawyer.html">สำหรับทนายความ</a></li>
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
            }
        }
    },

    // ครอบปุ่มที่ต้องบังคับ Login (เช่น รีวิว, บันทึกทนาย)
    requireLoginAction(actionCallback) {
        if (!this.isAuthenticated()) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณาเข้าสู่ระบบ',
                text: 'คุณต้องเข้าสู่ระบบก่อนจึงจะสามารถทำรายการนี้ได้',
                showCancelButton: true,
                confirmButtonText: 'ไปหน้าเข้าสู่ระบบ',
                cancelButtonText: 'ยกเลิก'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/login.html';
                }
            });
            return false;
        }
        // ถ้าล็อกอินแล้ว ให้ทำ action นั้นได้เลย
        if (typeof actionCallback === 'function') actionCallback();
        return true;
    }
};

// อัปเดต Navbar ทันทีเมื่อโหลดไฟล์นี้ (ถ้าหน้าโหลดเสร็จแล้ว)
document.addEventListener('DOMContentLoaded', () => {
    if(typeof Swal === 'undefined') {
        // Load SweetAlert if not present, needed for nice popups
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
        document.head.appendChild(script);
    }
    Auth.updateNavbar();
    Auth.updateHeaderProfile();
});
