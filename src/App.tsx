import Modal from 'react-modal';
import Dashboard from './components/Dashboard';

// Set modal root for accessibility
Modal.setAppElement('#root');

export default function App() {
  return <Dashboard />;
}
