import { useState } from 'react';
import Modal from 'react-modal';
import { formatDuration, calculateDuration } from '../utils/timeUtils';

interface LabelModalProps {
  isOpen: boolean;
  startTime: string;
  endTime: string;
  onClose: () => void;
  onSave: (label: string, color: string) => void;
  availableColors: string[];
}

export default function LabelModal({
  isOpen,
  startTime,
  endTime,
  onClose,
  onSave,
  availableColors,
}: LabelModalProps) {
  const [label, setLabel] = useState('');
  const [selectedColor, setSelectedColor] = useState(availableColors[0]);

  const duration = calculateDuration(startTime, endTime);

  const handleSave = () => {
    if (label.trim()) {
      onSave(label.trim(), selectedColor);
      setLabel('');
      setSelectedColor(availableColors[0]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && label.trim()) {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
      setLabel('');
    }
  };

  const modalStyles = {
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      zIndex: 1000,
    },
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      border: 'none',
      borderRadius: '16px',
      padding: 0,
      maxWidth: '500px',
      width: '90%',
    },
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onClose} style={modalStyles}>
      <div className="p-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Create Time Block</h3>
        <div className="flex items-center gap-3 mb-6">
          <div className="text-sm text-gray-600">
            {startTime} - {endTime}
          </div>
          <div className="w-1 h-1 rounded-full bg-gray-400"></div>
          <div className="text-sm font-medium text-blue-600">
            {formatDuration(duration)}
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Work, Gym, Study..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Color
            </label>
            <div className="grid grid-cols-5 gap-3">
              {availableColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`h-12 rounded-lg transition-all ${
                    selectedColor === color
                      ? 'ring-2 ring-offset-2 ring-gray-900 scale-105'
                      : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={handleSave}
            disabled={!label.trim()}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Create Block
          </button>
          <button
            onClick={() => {
              onClose();
              setLabel('');
              setSelectedColor(availableColors[0]);
            }}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 active:scale-95 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
