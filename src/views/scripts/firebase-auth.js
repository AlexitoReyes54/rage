import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";

const firebaseConfig = {
	apiKey: "AIzaSyALoZWvtYJFOEfHLRYp3Zq2KpZnDe1hEYI",
	authDomain: "chatpilot-1939a.firebaseapp.com",
	projectId: "chatpilot-1939a",
	storageBucket: "chatpilot-1939a.firebasestorage.app",
	messagingSenderId: "262014581379",
	appId: "1:262014581379:web:6cf8fd84cede68b19bf9b6",
	measurementId: "G-M2F4D2JEBJ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const login_btn = document.getElementById('login-btn');
const signup_btn = document.getElementById('signup-btn');
const out = document.getElementById('out');

login_btn.addEventListener('click', async () => {
	const email = emailInput.value;
	const password = passwordInput.value;
	try {
		await signInWithEmailAndPassword(auth, email, password);
		alert('welcome')
	} catch (error) {
		alert("Error: " + error.message);
	}
});

signup_btn.addEventListener('click', async () => {
	const email = emailInput.value;
	const password = passwordInput.value;
	try {
		await createUserWithEmailAndPassword(auth, email, password);
		alert("Usuario registrado con éxito");
	} catch (error) {
		console.error("Error al registrar:", error.message);
	}
});

out.addEventListener('click', async () => {
	try {
		console.log(auth);
		//await signOut(auth)
		const user = auth.currentUser;

		if (user) {
			const idToken = await user.getIdToken();
			console.log(idToken);
		} else {
			console.log("No user is signed in.");
		}



	} catch (error) {
		console.error("Error al registrar:", error.message);
	}
});

onAuthStateChanged(auth, (user) => {
	if (user) {
		console.log('yes user');
	} else {
		console.log('no user');
	}
});
