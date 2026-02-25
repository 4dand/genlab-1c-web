import { 
  FileCode, 
  Clock, 
  Hash, 
  DollarSign,
  Sparkles,
  Wifi,
  Server
} from 'lucide-react';
import { useEvaluationStore } from '@/store/evaluationStore';
import { useAppStore } from '@/store/appStore';

export function StatusBar() {
  const { 
    currentRun,
    currentTaskId,
    currentModelId,
    experiment 
  } = useEvaluationStore();
  const { apiConnected } = useAppStore();

  const currentTaskResult = experiment?.task_results.find(
    tr => tr.task_id === currentTaskId && tr.model_id === currentModelId
  );
  const run = currentTaskResult?.runs?.[currentRun ?? 0];
  
  return (
    <footer className="h-6 bg-bg-secondary border-t border-border-default flex items-center justify-between px-4 text-xs text-text-muted flex-shrink-0">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <FileCode className="w-3.5 h-3.5" />
          <span>1С:Предприятие 8.3</span>
        </div>
        
        {run && (
          <>
            <div className="flex items-center gap-1">
              <Hash className="w-3.5 h-3.5" />
              <span className="font-mono">{run.response_hash?.slice(0, 8)}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{(run.tokens_input ?? 0) + (run.tokens_output ?? 0)} токенов</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{run.elapsed_time?.toFixed(2)}с</span>
            </div>
            
            <div className="flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              <span>${(run.cost_total ?? 0).toFixed(4)}</span>
            </div>
          </>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Wifi className="w-3.5 h-3.5" />
          <span>OpenRouter</span>
          <div className={`w-1.5 h-1.5 rounded-full ${apiConnected ? 'bg-accent-green' : 'bg-accent-red'}`} />
        </div>
        <div className="flex items-center gap-1">
          <Server className="w-3.5 h-3.5" />
          <span>MCP</span>
          <div className="w-1.5 h-1.5 rounded-full bg-accent-purple/60" />
        </div>
        <span>
          GenLab-1C v1.0
        </span>
        {experiment && (
          <span className="text-text-secondary">
            {experiment.timestamp}
          </span>
        )}
      </div>
    </footer>
  );
}
