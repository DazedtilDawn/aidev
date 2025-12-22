import { useState, useEffect, useCallback } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Node, 
  Edge,
  ConnectionLineType,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import { Activity, ShieldAlert, FileCode, Scissors } from 'lucide-react';
import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:3001/api';
const SOCKET_URL = 'http://localhost:3001';

const App = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selections, setSelections] = useState<Record<string, 'full' | 'skeleton' | 'exclude'>>({});
  const [task, setTask] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchGraph = async () => {
    try {
      const response = await axios.get(`${API_BASE}/graph`);
      const { nodes: nodeData, edges: edgeData } = response.data;

      const formattedNodes = nodeData.map((n: any, i: number) => ({
        id: n.id,
        data: { label: n.label, risk: n.risk, fanIn: n.fanIn },
        position: { x: Math.cos(i) * 400 + 500, y: Math.sin(i) * 400 + 400 },
        style: {
          background: n.risk === 'high' ? '#fee2e2' : (n.risk === 'medium' ? '#fef3c7' : '#f3f4f6'),
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          padding: '10px',
          width: 150,
          textAlign: 'center' as const,
          fontSize: '12px',
          fontWeight: 'bold' as const
        }
      }));

      const formattedEdges = edgeData.map((e: any, i: number) => ({
        id: `e-${i}`,
        source: e.source,
        target: e.target,
        label: e.type,
        animated: true,
        type: ConnectionLineType.SmoothStep,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      }));

      setNodes(formattedNodes);
      setEdges(formattedEdges);
      
      setSelections(prev => {
        const next = { ...prev };
        nodeData.forEach((n: any) => {
          if (!next[n.id]) next[n.id] = 'exclude';
        });
        return next;
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching graph:', error);
    }
  };

  useEffect(() => {
    fetchGraph();

    // Socket.io for live updates
    const socket = io(SOCKET_URL);
    socket.on('graph_update', () => {
      console.log('Graph update received from server');
      fetchGraph();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const onNodeClick = (_: any, node: Node) => {
    setSelections(prev => {
      const current = prev[node.id];
      const next = current === 'exclude' ? 'full' : (current === 'full' ? 'skeleton' : 'exclude');
      return { ...prev, [node.id]: next };
    });
  };

  const generatePrompt = async () => {
    try {
      const response = await axios.post(`${API_BASE}/prompt`, {
        selections,
        task,
        provider: 'universal'
      });
      console.log('Generated Prompt:', response.data.content);
      alert('Prompt generated in console!');
    } catch (error) {
      alert('Failed to generate prompt');
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: '350px', background: '#1f2937', color: 'white', padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={24} /> Mission Control
        </h1>
        
        <div style={{ marginTop: '20px' }}>
          <label style={{ fontSize: '12px', color: '#9ca3af' }}>TASK DESCRIPTION</label>
          <textarea 
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="What are you working on?"
            style={{ 
              width: '100%', 
              height: '80px', 
              marginTop: '5px', 
              background: '#374151', 
              border: 'none', 
              borderRadius: '4px',
              padding: '10px',
              color: 'white',
              resize: 'none'
            }}
          />
        </div>

        <div style={{ marginTop: '20px', flex: 1 }}>
          <label style={{ fontSize: '12px', color: '#9ca3af' }}>CONTEXT MIXER</label>
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(selections).filter(([_, state]) => state !== 'exclude').map(([path, state]) => (
              <div key={path} title={path} style={{ background: '#374151', padding: '8px', borderRadius: '4px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{path.split('/').pop()}</span>
                <span style={{ 
                  padding: '2px 6px', 
                  borderRadius: '10px', 
                  background: state === 'full' ? '#10b981' : '#6366f1',
                  fontSize: '9px',
                  fontWeight: 'bold'
                }}>
                  {state.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={generatePrompt}
          style={{ 
            marginTop: '30px', 
            width: '100%', 
            padding: '12px', 
            background: '#3b82f6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Generate Context Packet
        </button>
      </div>

      {/* Graph Area */}
      <div style={{ flex: 1, position: 'relative', background: '#f9fafb' }}>
        {loading ? (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            Loading Project Graph...
          </div>
        ) : (
          <ReactFlow 
            nodes={nodes} 
            edges={edges}
            onNodeClick={onNodeClick}
            fitView
          >
            <Background color="#aaa" gap={16} />
            <Controls />
          </ReactFlow>
        )}
        
        {/* Legend */}
        <div style={{ position: 'absolute', bottom: '20px', right: '20px', background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Legend</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
            <div style={{ width: '12px', height: '12px', background: '#fee2e2', borderRadius: '2px' }} /> High Risk (High Fan-In)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{ width: '12px', height: '12px', background: '#fef3c7', borderRadius: '2px' }} /> Medium Risk
          </div>
          <div style={{ color: '#6b7280' }}>Click nodes to toggle Context State:</div>
          <div style={{ fontStyle: 'italic' }}>Exclude &rarr; Full &rarr; Skeleton</div>
        </div>
      </div>
    </div>
  );
};

export default App;
