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

import CytoscapeComponent from "react-cytoscapejs";
import { ElementDefinition } from "cytoscape";
import klay from "cytoscape-klay";
import cytoscape from "cytoscape";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import { StateMachine } from "@foxglove/schemas"; 


function prepare_graph(fsm_data: StateMachine) {
  let nodes = [];
  let edges = [];

  // get current state
  let current_state = 0;
  let fsm_ptr = fsm_data.states[0]!;

  while (current_state >= 0) {
    if (fsm_data.states[current_state]?.is_fsm) {
      current_state = fsm_data.states[current_state]!.current_state;
    } else {
      break;
    }
  }

  // create nodes and edges
  for (let state of fsm_data.states) {
    let type = "state";
    let name = state.name;

    if (state.is_fsm) {
      type = "fsm";
      if (state.id === 0) {
        name = "";
      }
    } else {
      if (current_state === state.id) {
        type = "current_state";
      }
    }

    if (state.id > 0) {
      nodes.push({
        data: {
          id: fsm_ptr.name + "node" + state.id,
          parent: fsm_ptr.name + "node" + state.parent,
          label: name,
          type: type,
        },
      });
    }

    // outcome
    for (let outcome of state.outcomes) {

      // FSM outcome
      if (state.is_fsm) {
        nodes.push({
          data: {
            id: fsm_ptr.name + "node" + state.id + outcome,
            parent: fsm_ptr.name + "node" + state.id,
            label: outcome,
            type: "outcome",
          },
        });
      }

      // edges
      let target = "0";
      let source = (state.id).toString();

      if (state.is_fsm) {
        source = source + outcome;
      }

      let outcome_transition = state.transitions.find((transition) => transition.outcome === outcome);

      if (outcome_transition == undefined) {
        target = state.parent + outcome;
      } else {
        // transition to state
        for (let aux_state of fsm_data.states) {

          if (
            aux_state.name === outcome_transition.state &&
            aux_state.parent === state.parent
          ) {
            target = (aux_state.id).toString();
            break;
          }
        }

        // transition to outcome
        if (target === "0" && state.parent >= 0) {
          for (let outcome of fsm_data.states[state.parent]!.outcomes) {
            if (outcome === outcome_transition.outcome) {
              target = (state.parent).toString() + outcome;
              break;
            }
          }
        }
      }

      if (state.parent >= 0) {
        edges.push({
          data: {
            id: fsm_ptr.name + "edge" + state.id + outcome,
            source: fsm_ptr.name + "node" + source,
            target: fsm_ptr.name + "node" + target,
            label: outcome,
          },
        });
      }
    }
  }

  return [nodes, edges];
}


function FSM({fsm_data, alone}: {fsm_data: StateMachine | undefined, alone: boolean}) {
  const layout = {
    name: "klay",
    klay: {
      spacing: 40,
      direction: "DOWN",
      nodePlacement: "BRANDES_KOEPF",
      nodeLayering: "LONGEST_PATH",
      fixedAlignment: "BALANCED",
      layoutHierarchy: true,
      mergeHierarchyCrossingEdges: false,
    },
  };

  if (fsm_data === undefined) {
    return <div></div>;
  }

  cytoscape.use(klay);

  if (fsm_data === undefined) {
    return <div></div>;
  }

  let [nodes, edges] = prepare_graph(fsm_data);
  // let [nodes, edges] = example_graph();

  let height = "40vh";
  if (alone) {
    height = "80vh";
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <Typography variant="h4" component="h4" gutterBottom align="center">
            {fsm_data.states[0]!.name}
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Box
            display="flex"
            border={1}
            justifyContent="center"
            style={{ width: "100%", height: "100%" }}
          >
            <CytoscapeComponent
              elements={CytoscapeComponent.normalizeElements({
                nodes: nodes as ElementDefinition[],
                edges: edges as ElementDefinition[],
              })}
              stylesheet={
                [
                  {
                    selector: "node",
                    style: {
                      label: "data(label)",
                      "border-color": "black",
                      "border-width": 2,
                      "text-valign": "center",
                      "text-halign": "center",
                      "font-size": 15,
                      height: "label",
                      width: "label",
                      "padding-top": '15px',
                      "padding-left": '20px',
                    },
                  },
                  {
                    selector: "node[type = 'fsm']",
                    style: {
                      'text-valign': "top",
                      'text-halign': "center",
                    },
                  },
                  {
                    selector: "node[type = 'outcome']",
                    style: {
                      "background-color": "red",
                      "shape": "round-rectangle",
                      "padding-top": '10px',
                      "padding-left": '10px',
                    },
                  },
                  {
                    selector: "node[type = 'current_state']",
                    style: {
                      backgroundColor: "green",
                    },
                  },
                  {
                    selector: "edge",
                    style: {
                      label: "data(label)",
                      "target-arrow-shape": "triangle",
                      "curve-style": "bezier", //unbundled
                      //"text-rotation": "autorotate",
                    },
                  },
                ]
              }
              layout={layout}
              style={{ width: "100%", height: `${height}` }}
              zoomingEnabled={true}
              boxSelectionEnabled={false}
              autoungrabify={true}
              panningEnabled={true}
              userZoomingEnabled={false}
              userPanningEnabled={false}
            />
          </Box>
        </Grid>
      </Grid>
    </div>
    )
}

export default FSM;
