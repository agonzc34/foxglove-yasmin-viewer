import { Grid } from "@mui/material";
import { ScrollPanel } from "primereact/scrollpanel";
import { MessageEvent, Topic, Immutable, PanelExtensionContext, SettingsTreeAction } from "@foxglove/studio";
import { StateMachine } from "@foxglove/schemas";
import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import FSM from "./FSM";
import ReactDOM from "react-dom";

type PanelState = {
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
                    newState['selectedFsm'] = "ALL";
                    setFsmList(_ => []);
                    return newState;
                })
            } else {
                setPanelState((prev) => {
                    let newState = { ...prev };
                    newState['selectedFsm'] = (value as string).trim();
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

        const fsmOptions = [{ label: "ALL", value: "ALL" }].concat(fsmList?.map((fsm: StateMachine) => {
            return { label: fsm.states[0]?.name.trim() ?? "None", value: fsm.states[0]?.name.trim() ?? "None" };
        }) ?? []);

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
    }, [panelState, actionHandler, context, fsmList]);

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
                    return receivedMsg.message.states[0]?.name.trim() === msg.states[0]?.name.trim();
                });
            }) ?? [];
            let newFsmList = formerMsgs.concat(receivedMsgs.map((msg) => msg.message));

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
            maxHeight: "100%"
        }}
    >
        <ScrollPanel style={{ width: '100%', height: '92vh' }}>
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
        </ScrollPanel>
    </div>
    );
}

export function initYasminViewer(context: PanelExtensionContext): () => void {
    ReactDOM.render(<Viewer context={context} />, context.panelElement);

    return () => {
        ReactDOM.unmountComponentAtNode(context.panelElement);
    };
}
