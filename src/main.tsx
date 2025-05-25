import ReactDOM from 'react-dom/client';
import './styles/index.sass';
import './styles/sty.css';
import App from './App';


const rootElement = document.getElementById('root');

if (!rootElement) {
    throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
    <App />
);
