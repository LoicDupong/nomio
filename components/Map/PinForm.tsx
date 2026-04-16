interface PinFormProps {
  tripId: string;
  lat: number;
  lng: number;
  onClose: () => void;
}

export default function PinForm({ onClose }: PinFormProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: 'white', padding: '1.5rem', width: '100%', borderRadius: '20px 20px 0 0' }}>
        <p>Pin form coming soon</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
