import { Grid, TextField, Autocomplete, Button } from "@mui/material";
import { MessageEvent, Topic, Immutable, PanelExtensionContext, SettingsTreeAction } from "@foxglove/studio";
import { StateMachine } from "@foxglove/schemas";
import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import FSM from "./FSM";
import ReactDOM from "react-dom";

type PanelState = {
    listFsms: string[];
    selectedFsm: string;
    [key: string]: string | string[];
}

function Viewer({ context }: { context: PanelExtensionContext }): JSX.Element {
    const [topic, setTopics] = useState<Immutable<Topic[]> | undefined>();
    const [messages, setMessages] = useState<Immutable<MessageEvent[]> | undefined>();
    
    const [fsmList, setFsmList] = useState<StateMachine[]>([]);
    const [currFsmData, setCurrFsmData] = useState<StateMachine | undefined>();

    const [panelState, setPanelState] = useState<PanelState>(() => {
        return { 
            listFsms: [],
            selectedFsm: "ALL",
        }
    });

    const [renderDone, setRenderDone] = useState<(() => void) | undefined>();

    const actionHandler = useCallback((action: SettingsTreeAction) => {
        if (action.action == "update") {
            const { path, value } = action.payload;

            if (path[1] === "clear") {
                setPanelState((prev) => {
                    let newState = { ...prev };
                    newState['listFsms'] = [];
                    newState['selectedFsm'] = "ALL";
                    return newState;
                })
            } else {
                setPanelState((prev) => {
                    let newState = { ...prev };
                    newState['selectedFsm'] = value as string;
                    setCurrFsmData(fsmList?.find((fsm: StateMachine) => {
                        return fsm.states[0]?.name === value;
                    }));
                    return newState;
                })
            }
        }
    }, [fsmList]);

    useEffect(() => {
        context.saveState(panelState);

        const fsmOptions = [{ label: "ALL", value: "ALL" }].concat(panelState.listFsms.map(fsm => ({ label: fsm ?? "None", value: fsm ?? "None" })));

        context.updatePanelSettingsEditor({
            actionHandler,
            nodes: {
                data: {
                    label: "Machine States",
                    icon: "Star",
                    fields: {
                        fsmList: {
                            label: "Finite State Machines",
                            input: "select",
                            options: fsmOptions,
                            value: panelState.selectedFsm,
                        },
                        clear: {
                            label: "Clear",
                            input: "boolean",
                            value: false,
                        }
                    }
                }
            }
        })
    }, [panelState, actionHandler, context]);

    useLayoutEffect(() => {
        context.onRender = (renderState, done) => {
            setRenderDone(() => done);
            setTopics(renderState.topics);
            setMessages(renderState.currentFrame);
        };

        context.watch("topics");
        context.watch("currentFrame");

        context.subscribe([{ topic: "/fsm_viewer" }]);


    }, [context]);

    useEffect(() => {
        let receivedMsgs: MessageEvent<StateMachine>[] = messages as MessageEvent<StateMachine>[] ?? [];

        setFsmList(prev => {
            let formerMsgs = prev?.filter((msg: StateMachine) => {
                return !receivedMsgs?.some((receivedMsg: MessageEvent<StateMachine>) => {
                    return receivedMsg.message.states[0]?.name === msg.states[0]?.name;
                });
            }) ?? [];
            let newFsmList = formerMsgs.concat(receivedMsgs.map((msg) => msg.message));

            setPanelState((prev) => {
                let newState = { ...prev };
                newState['listFsms'] = newFsmList.map(fsm => fsm.states[0]?.name ?? "None");
                return newState;
            });

            return newFsmList.sort((a, b) => {
                return a.states[0]!.name?.localeCompare(b.states[0]!.name ?? "None") ?? 0;
            });
        });
    }, [messages]);

    useEffect(() => {
        renderDone?.();
    }, [renderDone]);

    return (<div
        style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            margin: "5px",
        }}
    >
        <Grid container spacing={3}>
            {panelState.selectedFsm === "ALL" ? (
                fsmList?.map((fsm: StateMachine) => {
                    return (
                        <Grid item xs={12} key={fsm.states[0]?.name}>
                            <FSM fsm_data={fsm} alone={false} />
                        </Grid>
                    );
                })
            ) : (
                <Grid item xs={12}>
                    <FSM fsm_data={currFsmData} alone={true} />
                </Grid>
            )}
            
        </Grid>
    </div>
    );
}

export function initYasminViewer(context: PanelExtensionContext): () => void {
    ReactDOM.render(<Viewer context={context} />, context.panelElement);

    return () => {
        ReactDOM.unmountComponentAtNode(context.panelElement);
    };
}
