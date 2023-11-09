import { Grid, TextField, Autocomplete } from "@mui/material";
import { MessageEvent, Topic, Immutable, PanelExtensionContext } from "@foxglove/studio";
import { StateMachine } from "@foxglove/schemas";
import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import FSM from "./FSM";
import ReactDOM from "react-dom";

function Viewer({ context }: { context: PanelExtensionContext }): JSX.Element {
    const [topic, setTopics] = useState<Immutable<Topic[]> | undefined>();
    const [messages, setMessages] = useState<Immutable<MessageEvent[]> | undefined>();
    const [fsmList, setFsmList] = useState<StateMachine[]>([]);
    const [fsmNameList, setFSMNameList] = useState<string[]>([]);
    const [currFsmData, setCurrFsmData] = useState<StateMachine | undefined>();
    const [currFsmName, setCurrFsmName] = useState<string | undefined>('ALL');

    const [renderDone, setRenderDone] = useState<(() => void) | undefined>();

    useLayoutEffect(() => {
        context.onRender = (renderState, done) => {
            setRenderDone(() => done);
            setTopics(renderState.topics);
            setMessages(renderState.currentFrame);

            let receivedMsgs: MessageEvent<StateMachine>[] = renderState.currentFrame as MessageEvent<StateMachine>[] ?? [];

            setFsmList(prev => {
                let formerMsgs = prev?.filter((msg: StateMachine) => {
                    return !receivedMsgs?.some((receivedMsg: MessageEvent<StateMachine>) => {
                        return receivedMsg.message.states[0]?.name === msg.states[0]?.name;
                    });
                }) ?? [];
                let newFsmList = formerMsgs.concat(receivedMsgs.map((msg) => msg.message));
                setFSMNameList(newFsmList.map((msg) => msg.states[0]?.name ?? "None").concat('ALL').sort());

                return newFsmList.sort((a, b) => {
                    return a.states[0]!.name?.localeCompare(b.states[0]!.name ?? "None") ?? 0;
                });
            });
        };

        context.watch("topics");
        context.watch("currentFrame");

        context.subscribe([{ topic: "/fsm_viewer" }]);


    }, [context]);

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
            <Grid item xs={12}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <Autocomplete
                        id="combo-box"
                        disableClearable={true}
                        options={fsmNameList}
                        getOptionLabel={(option) => option}
                        isOptionEqualToValue={(option, value) => option === value}
                        defaultValue={"ALL"}
                        value={currFsmName}
                        onChange={(_, value) => {
                            setCurrFsmName(value);
                            setCurrFsmData(fsmList?.find((fsm: StateMachine) => {
                                return fsm.states[0]?.name === value;
                            }));

                        }}
                        style={{ width: 300 }}
                        renderInput={(params) => (
                            <TextField {...params} label="FSM" variant="outlined" />
                        )}
                    />
                </div>
            </Grid>

            {currFsmName === "ALL" ? (
                fsmList?.map((fsm: StateMachine) => {
                    return (
                        <Grid item xs={6} key={fsm.states[0]?.name}>
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
