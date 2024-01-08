// Copyright (C) 2023  Miguel Ángel González Santamarta
// Copyright (C) 2024  Alejandro González Cantón

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { Grid } from "@mui/material";
import { ScrollPanel } from "primereact/scrollpanel";
import { MessageEvent, Topic, Immutable, PanelExtensionContext, SettingsTreeAction } from "@foxglove/studio";
import { StateMachine } from "@foxglove/schemas";
import { useState, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import FSM from "./FSM";
import ReactDOM from "react-dom";

type PanelState = {
    selectedFsm: string;
    states: { [key: string]: StateMachine };
    [key: string]: string | { [key: string]: StateMachine };
}

function Viewer({ context }: { context: PanelExtensionContext }): JSX.Element {
    const [topic, setTopics] = useState<Immutable<Topic[]> | undefined>();
    const [messages, setMessages] = useState<Immutable<MessageEvent[]> | undefined>();

    const [panelState, setPanelState] = useState<PanelState>(() => {
        return {
            selectedFsm: "ALL",
            states: {},
        };
    });

    const stateMachinesNames = useMemo(() => {
        let names = Object.keys(panelState.states) ?? [];
        return names.concat("ALL").sort((a, b) => {
            return a.localeCompare(b);
        });
    }, [panelState]);

    const [renderDone, setRenderDone] = useState<(() => void) | undefined>();

    const actionHandler = useCallback((action: SettingsTreeAction) => {
        if (action.action == "update") {
            const { path, value } = action.payload;

            if (path[1] === "clear") {
                setPanelState((_) => {
                    return {
                        selectedFsm: "ALL",
                        states: {},
                    }
                });
            } else {
                setPanelState((prev) => {
                    return{
                        ...prev,
                        selectedFsm: value as string,
                    }
                });
            }
        }
    }, [context, panelState]);

    useEffect(() => {
        context.saveState(panelState);

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
                            options: stateMachinesNames.map((name) => ({ label: name, value: name })),
                            // options: [{ label: "ALL", value: "ALL" }],
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

        let prevState = { ...panelState };
        let modified = false;

        for (let msg of receivedMsgs) {
            let fsm = msg.message;
            if (fsm) {
                prevState.states[fsm.states[0]?.name!] = fsm;
            }
        }

        setPanelState(prevState);
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

        <ScrollPanel style={{ height: '92vh', width: '100%' }}>
            <div style={{ width: "100%", textAlign: "center" }}>
                <h1>Yasmin Viewer</h1>
            </div>
            <Grid container spacing={3}>
                {panelState.selectedFsm === "ALL" && panelState.states != undefined ? (
                    Object.values(panelState.states).map((fsm: StateMachine) => {
                        return (
                            <Grid item xs={6} key={fsm.states[0]?.name}>
                                <FSM fsm_data={fsm} alone={false} />
                            </Grid>
                        );
                    })
                ) : (
                    <Grid item xs={12}>
                        <FSM fsm_data={panelState.states[panelState.selectedFsm]} alone={true} />
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
