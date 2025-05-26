import { TronAuthButton } from "../../components/tronAuthButton/TronAuthButton";

export default function Home() {
    return (
        <div style={{ minHeight: "100vh", background: "#f8fafd" }}>
            {/* Верхняя кнопка по центру */}
            <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "40vh"
            }}>
                <TronAuthButton />
            </div>
            {/* ...Твой остальной контент... */}

            {/* Нижняя кнопка по центру */}
            <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "20vh"
            }}>
                <TronAuthButton />
            </div>
        </div>
    );
}
