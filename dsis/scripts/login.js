// --- Firebase config ---
const firebaseConfig = {
  apiKey: "AIzaSyC4JIHnTkEczydiS-OoU4FibyzWbCdlHA0",
  authDomain: "dsis-b5f5c.firebaseapp.com",
  projectId: "dsis-b5f5c",
  storageBucket: "dsis-b5f5c.appspot.com",
  messagingSenderId: "414661916496",
  appId: "1:414661916496:web:53d8bcbe838e26c96dde55"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Get DOM elements
var loginForm = document.getElementById('login-form');
var usernameInput = document.getElementById('login-username');
var passwordInput = document.getElementById('login-password');

loginForm.addEventListener('submit', function(e) {
  e.preventDefault();

  var userInput = usernameInput.value.trim();
  var password = passwordInput.value;

  if (!userInput || !password) {
    alert('Please enter both username/nickname and password.');
    return;
  }

  // Try login by username (email)
  db.collection('users')
    .where('username', '==', userInput)
    .where('password', '==', password)
    .get()
    .then(function(snapshot) {
      if (!snapshot.empty) {
        processUser(snapshot.docs[0].data());
      } else {
        // Try login by nickname
        db.collection('users')
          .where('nickname', '==', userInput)
          .where('password', '==', password)
          .get()
          .then(function(nicknameSnapshot) {
            if (!nicknameSnapshot.empty) {
              processUser(nicknameSnapshot.docs[0].data());
            } else {
              alert('Invalid username/nickname or password.');
              usernameInput.value = '';
              passwordInput.value = '';
              usernameInput.focus();
            }
          })
          .catch(function(error) {
            alert('Error during login: ' + error.message);
            console.error(error);
          });
      }
    })
    .catch(function(error) {
      alert('Error during login: ' + error.message);
      console.error(error);
    });

  function processUser(user) {
    if (user.userCategory === 'admin' || user.userCategory === 'cashier') {
      sessionStorage.setItem('dsisUser', JSON.stringify({
        nickname: user.nickname,
        fullName: user.fullName,
        userCategory: user.userCategory,
        username: user.username
      }));

      if (user.userCategory === 'admin') {
        window.location.href = '../pages/admin.html';
      } else {
        window.location.href = '../pages/cashier.html';
      }
    } else {
      alert('This account does not have login access.');
      usernameInput.value = '';
      passwordInput.value = '';
      usernameInput.focus();
    }
  }
});