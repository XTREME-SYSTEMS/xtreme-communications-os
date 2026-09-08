import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Brain, Clock, Calendar, MessageSquare, FileText, Image, Pause, GitBranch, Type, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = { agent: Brain, time_window: Clock, day_of_week: Calendar, delay: Pause, script: Type, template: FileText, message: MessageSquare, image: Image, condition: GitBranch };

export default function WorkflowCanvas({ steps, selectedId, onSelect, onReorder, onDelete, channelType }) {
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    onReorder(result.source.index, result.destination.index);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-background">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-display uppercase tracking-wider text-muted-foreground">Channel:</span>
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize">{channelType}</span>
          <span className="text-xs text-muted-foreground ml-auto">{steps.length} step{steps.length !== 1 ? "s" : ""}</span>
        </div>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="workflow-canvas">
            {(provided, snapshot) => (
              <div ref={provided.innerRef} {...provided.droppableProps}
                className={cn("min-h-[300px] rounded-xl border-2 border-dashed p-3 transition-colors",
                  snapshot.isDraggingOver ? "border-primary bg-primary/5" : "border-border bg-card/50")}>
                {steps.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-[260px] text-center">
                    <Plus className="h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">Click elements from the left to build your workflow</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Drag steps to reorder</p>
                  </div>
                )}
                {steps.map((step, index) => {
                  const Icon = ICONS[step.type] || Type;
                  return (
                    <Draggable key={step.id} draggableId={step.id} index={index}>
                      {(prov, snap) => (
                        <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                          onClick={() => onSelect(step.id)}
                          className={cn("flex items-center gap-3 p-3 rounded-lg border mb-2 cursor-pointer transition-all",
                            selectedId === step.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card hover:border-primary/30",
                            snap.isDragging && "shadow-lg opacity-80")}>
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-mono text-muted-foreground">{index + 1}</span>
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            {index < steps.length - 1 && <div className="w-px h-4 bg-border mt-1" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{step.label}</p>
                            <p className="text-xs text-muted-foreground truncate">{step.config?.summary || "Click to configure"}</p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); onDelete(step.id); }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}