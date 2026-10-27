import React, {useState} from "react";
import {useNavigate} from "react-router-dom";

function Login(){
    const [isLogin, setIsLogin] = useState(true);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const[name,setName] = useState("");
   
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();

        if(isLogin){
            navigate("/dashboard");

        }
        else{
            alert("Signing up: " + name + "-" + email);
        }
    };
    return(
        <div style={styles.container}>
            <form className="login-form" onSubmit={handleSubmit} style={styles.form}>
                <h2>{isLogin ? "MASHTAL Login" : "Sign Up"}</h2>
                {!isLogin && (
                 <input 
                type="name"
                placeholder="Enter name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="login-input" style={styles.input}
                required
                />
                )}

                <input 
                type="email"
                placeholder="Enter Email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input" style={styles.input}
                required
                />
                
                <input 
                type="password"
                placeholder="Enter Password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input" style={styles.input}
                required
                />
                

                <button type="submit" style={styles.button}>{isLogin ? "Login" : "Sign Up"}</button> 
                <p style={{marginTop: "10px"}}>
                    {isLogin ? "Create an account?" : "already have an account?"}
                    <span 
                    onClick={() => setIsLogin(!isLogin)}
                    style={styles.link}
                    >
                        {isLogin ? "Sign Up" : "Login"}
                    </span>
                </p>
            </form>
        </div>
    )
}

const styles = {
    container: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height:"100vh",
        background: "linear-gradient(135deg, #cef1d4, #f4fff7)",
    },
    form: {
        background:"white",
        padding: "38px 34px",
        borderRadius:"40px",
        boxShadow:"0 18px 45px rgba(45, 106, 79, 0.63)",
        width:"380px",
        textAlign:"center",
    },
    input: {
        borderRadius: "15px",
        padding: "13px",
        marginBottom: "7px",
        background: "#f5fdf6",
        border: "2px solid #b6f0bf",
        width: "300px",
        
    },
    button: {
        width:"100%",
        padding: "10px",
        margin: "10px",
        backgroundColor:"#1d5840",
        color:"#fff",
        border:"none",
        borderRadius: "15px",
        cursor: "pointer",
    },
    link: {
        color: " #1e6448",
        cursor: "pointer",
        marginLeft: "5px",
    },
    
};
export default Login;