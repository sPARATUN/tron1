import { TronAuthButton } from "../../components/tronAuthButton/TronAuthButton";

export default function Home() {
    return (
        <div style={{
            minHeight: "100vh",
            background: "#f8fafd",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center"
        }}>
            <h1>AMLTrack Checker</h1>
            <div style={{ margin: "40px 0" }}>
                <TronAuthButton />
            </div>
            <div style={{ margin: "40px 0" }}>
                <TronAuthButton />
            </div>
        </div>
    );
}
