document.addEventListener('DOMContentLoaded', () => {

  const savedData = localStorage.getItem('userProfile');
  let data = {
    firstname: "อานนท์",
    lastname: "ใจดี",
    username: "anon_jaidee",
    email: "anon.jaidee@gmail.com",
    password: "Anon542@j"
  };

  if (savedData) {
    data = JSON.parse(savedData);
  }

  if (document.getElementById('inputName')) document.getElementById('inputName').value = data.firstname || '';
  if (document.getElementById('inputLastname')) document.getElementById('inputLastname').value = data.lastname || '';
  if (document.getElementById('inputUsername')) document.getElementById('inputUsername').value = data.username || '';
  if (document.getElementById('inputEmail')) document.getElementById('inputEmail').value = data.email || '';

  if (document.getElementById('displayName')) document.getElementById('displayName').innerText = `${data.firstname || ''} ${data.lastname || ''}`;
  if (document.getElementById('displayUsername')) document.getElementById('displayUsername').innerText = data.username ? `@${data.username}` : '';

  const fileInput = document.getElementById('uploadNewpic');
  const profileImageDisply = document.getElementById('showPic');

  if (fileInput && profileImageDisply) {
    fileInput.addEventListener('change', function(event) {
      const file = event.target.files[0];

      if (file) {
        if (!file.type.match('image.*')) {
          alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น (jpeg, png)');
          return; 
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
          profileImageDisply.src = e.target.result;
        }
        reader.readAsDataURL(file);
      }
    });
  }

  // ตอนกดบันทึก
  const editForm = document.getElementById('editProfileform'); 

  if (editForm) {
    editForm.addEventListener('submit', (event) => {
      event.preventDefault();

      let newFirstname = document.getElementById('inputName').value.trim();
      let newLasttname = document.getElementById('inputLastname').value.trim();
      let newUsername = document.getElementById('inputUsername').value.trim();
      let newEmail = document.getElementById('inputEmail') ? document.getElementById('inputEmail').value.trim() : "";

      if (newFirstname === "") { newFirstname = originalData.firstname; document.getElementById('inputName').value = originalData.firstname; }
      if (newLasttname === "") { newLasttname = originalData.lastname; document.getElementById('inputLastname').value = originalData.lastname; }
      if (newUsername === "")  { newUsername = originalData.username; document.getElementById('inputUsername').value = originalData.username; }
      if (newEmail === "")     { newEmail = originalData.email; document.getElementById('inputEmail').value = originalData.email; }

      let finalPassword = originalData.password;
      
      const oldPasswordInput = document.getElementById('oldPassword');
      const newPasswordInput = document.getElementById('newPassword');
      const confirmNewpasswordInput = document.getElementById('confirmNewpassword');

      if (oldPasswordInput && newPasswordInput && confirmNewpasswordInput) {
        const oldPassword = oldPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const confirmNewpassword = confirmNewpasswordInput.value;

        if (newPassword !== "" || confirmNewpassword !== "") {
          if (newPassword !== confirmNewpassword) {
            alert("รหัสผ่านไม่ตรงกัน!");
            return;
          }
          if (oldPassword !== originalData.password) {
            alert("รหัสผ่านเดิมไม่ถูกต้อง!");
            return;
          }
          finalPassword = newPassword;
        }
      }

      const updateData = {
        firstname: newFirstname,
        lastname: newLasttname,
        username: newUsername,
        email: newEmail,
        password: finalPassword
      };

      const currentStorage = JSON.parse(localStorage.getItem('userProfile')) || {};
      const newDataToSave = {...currentStorage, ...updateData};
      localStorage.setItem('userProfile', JSON.stringify(newDataToSave));
      originalData = updateData;

      document.getElementById('displayName').innerText = `${updateData.firstname} ${updateData.lastname}`;
      document.getElementById('displayUsername').innerText = `@${updateData.username}`;

      if (oldPasswordInput) oldPasswordInput.value = "";
      if (newPasswordInput) newPasswordInput.value = "";
      if (confirmNewpasswordInput) confirmNewpasswordInput.value = "";

      alert('บันทึกการเปลี่ยนแปลง!');
    });
  }
});