import { useState, useRef, useCallback, useEffect, type ChangeEvent } from 'react';
import { Canvas,} from '@react-three/fiber';
import { OrbitControls, useGLTF, Html } from '@react-three/drei';
import { Upload, X } from 'lucide-react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';

// Type definitions
interface Hotspot {
  id: string;
  position: [number, number, number];
  label: string;
}

interface HotspotProps {
  position: [number, number, number];
  label: string;
  onDelete: () => void;
}

interface ModelProps {
  url: string;
  onAddHotspot: (position: THREE.Vector3, label: string) => void;
}

interface SceneProps {
  modelUrl: string | null;
  hotspots: Hotspot[];
  onAddHotspot: (position: THREE.Vector3, label: string) => void;
  onDeleteHotspot: (id: string) => void;
}

// Hotspot component
function Hotspot({ position, label, onDelete }: HotspotProps) {
  const [hovered, setHovered] = useState(false);
  
  return (
      <group position={position}>
      {/* Subtle indicator that's only visible on hover */}
      {hovered && (
        <mesh>
          <sphereGeometry args={[0.05]} />
          <meshBasicMaterial color="#4444ff" transparent opacity={0.5} />
        </mesh>
      )}
      
      <Html>
        <div 
          className="text-white px-2 py-1 rounded text-xs cursor-pointer whitespace-nowrap"
          style={{ 
            background: 'rgba(0, 0, 0, 0.3)', // Semi-transparent background
            backdropFilter: 'blur(4px)' // Frosted glass effect (optional)
          }}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          {label}
          <button 
            className="ml-2 text-red-400 hover:text-red-200 pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            ×
          </button>
        </div>
      </Html>
    </group>
  );
}

// 3D Model component
function Model({ url, onAddHotspot }: ModelProps) {
  const { scene } = useGLTF(url);
  const modelRef = useRef<THREE.Group>(null);

  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
  if (event.shiftKey) {
    event.stopPropagation();
    const point = event.point;
    const label = prompt('Enter hotspot label:');
    if (label) {
      onAddHotspot(point, label);
    }
  }
}, [onAddHotspot]);

  return (
    <primitive 
      ref={modelRef}
      object={scene} 
      onClick={handleClick}
      scale={[1, 1, 1]}
    />
  );
}

// Scene component
function Scene({ modelUrl, hotspots, onAddHotspot, onDeleteHotspot }: SceneProps) {
  const controlsRef = useRef<any>(null);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />
      
      {modelUrl && (
        <>
          <Model 
            url={modelUrl} 
            onAddHotspot={onAddHotspot}
          />
          {hotspots.map((hotspot) => (
            <Hotspot
              key={hotspot.id}
              position={hotspot.position}
              label={hotspot.label}
              onDelete={() => onDeleteHotspot(hotspot.id)}
            />
          ))}
        </>
      )}
      
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={1}
        maxDistance={50}
      />
      
      <gridHelper args={[10, 10]} />
    </>
  );
}

// Main component
export default function SwiftXR3DEditor() {
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs when component unmounts or model changes
  useEffect(() => {
    return () => {
      if (modelUrl) {
        URL.revokeObjectURL(modelUrl);
      }
    };
  }, [modelUrl]);

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.glb')) {
      setError('Please select a .GLB file');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    // Revoke previous URL if exists
    if (modelUrl) {
      URL.revokeObjectURL(modelUrl);
    }
    
    try {
      const url = URL.createObjectURL(file);
      setModelUrl(url);
      setHotspots([]); // Clear existing hotspots when loading new model
    } catch (err) {
      setError('Failed to load model');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const addHotspot = (position: THREE.Vector3, label: string) => {
    const newHotspot: Hotspot = {
      id: Date.now().toString(),
      position: [position.x, position.y, position.z],
      label: label
    };
    setHotspots(prev => [...prev, newHotspot]);
  };

  const deleteHotspot = (id: string) => {
    setHotspots(prev => prev.filter(h => h.id !== id));
  };

  const clearHotspots = () => {
    setHotspots([]);
  };

  return (
    <div className="w-full h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col">
  
      <header className="bg-gray-800 shadow-lg border-b border-gray-700 p-4">
        <h1 className="text-2xl font-bold text-white mb-4">SwiftXR 3D Mini-Editor</h1>
        
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Upload size={20} />
            {isLoading ? 'Loading...' : 'Import GLB Model'}
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          {modelUrl && (
            <>
              <button
                onClick={clearHotspots}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <X size={20} />
                Clear Hotspots ({hotspots.length})
              </button>
              
              <div className="text-sm text-gray-300 bg-gray-700 px-3 py-2 rounded-lg">
                <span className="font-medium">Tip:</span> Hold Shift + Click on the model to add hotspots
              </div>
            </>
          )}
        </div>
        
        {error && (
          <div className="mt-2 p-3 bg-red-900 text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}
      </header>

      {/* 3Dimen Viewport */}
      <main className="flex-1 relative">
        {!modelUrl ? (
          <div className="flex items-center justify-center h-full bg-gray-800">
            <div className="text-center p-8 bg-gray-700 rounded-xl shadow-lg">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-600 rounded-lg flex items-center justify-center">
                <Upload size={32} className="text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">No 3D Model Loaded</h2>
              <p className="text-gray-300 mb-4">Upload a .GLB file to get started</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Choose GLB File
              </button>
            </div>
          </div>
        ) : (
          <Canvas camera={{ position: [5, 5, 5], fov: 50 }} className="bg-gray-900">
            <Scene 
              modelUrl={modelUrl}
              hotspots={hotspots}
              onAddHotspot={addHotspot}
              onDeleteHotspot={deleteHotspot}
            />
          </Canvas>
        )}
        
        {/*Info for the Controls */}
        {modelUrl && (
          <div className="absolute bottom-4 left-4 bg-gray-800 bg-opacity-90 p-4 rounded-lg shadow-lg text-sm text-white">
            <h3 className="font-semibold mb-2">Controls:</h3>
            <div className="space-y-1 text-gray-300">
              <div>• Left click + drag: Rotate camera</div>
              <div>• Right click + drag: Pan camera</div>
              <div>• Scroll wheel: Zoom in/out</div>
              <div>• Shift + click model: Add hotspot</div>
            </div>
          </div>
        )}
        
        {/* Hotspots List */}
        {hotspots.length > 0 && (
          <div className="absolute top-4 right-4 bg-gray-800 bg-opacity-90 p-4 rounded-lg shadow-lg max-w-xs">
            <h3 className="font-semibold mb-2 text-white">Hotspots ({hotspots.length})</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {hotspots.map((hotspot) => (
                <div key={hotspot.id} className="flex items-center justify-between p-2 bg-gray-700 rounded text-sm text-white">
                  <span className="truncate flex-1">{hotspot.label}</span>
                  <button
                    onClick={() => deleteHotspot(hotspot.id)}
                    className="ml-2 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}