export const ModelDefaults = {
  expression: {
    type: "expression",
    id: "29", // should never be used
    color: "#2d70b3",
    latex: "",
    description: "",
    lineOpacity: "",
    lineWidth: "",
    clickableInfo: {
      enabled: false,
      latex: "",
    },
    "clickableInfo.enabled": false,
    "clickableInfo.latex": "",
    hidden: false,
    fillOpacity: "",
    lineStyle: "SOLID",
    parametricDomain: {
      min: "",
      max: "",
    },
    "parametricDomain.min": "",
    "parametricDomain.max": "",
    showLabel: false,
    pointStyle: "POINT",
    dragMode: "AUTO",
    labelSize: "",
    labelOrientation: "default",
    labelAngle: "",
    label: "",
    editableLabelMode: "NONE",
    residualVariable: "",
    regressionParameters: {},
    polarDomain: {
      min: "",
      max: "",
    },
    "polarDomain.min": "",
    "polarDomain.max": "",
    colorLatex: "",
  },
  table: {
    id: "47", // no
    type: "table",
    columns: [
      {
        latex: "x_{3}", // changes each time
        color: "#6042a6",
        hidden: false,
        values: [],
        points: true,
        lines: false,
        dragMode: "NONE",
        pointStyle: "POINT",
        lineStyle: "SOLID",
        colorLatex: "",
        lineOpacity: "",
        lineWidth: "",
        pointOpacity: "",
        pointSize: "",
        id: "45", // no
      },
      {
        latex: "y_{3}", // changes each time
        color: "#000000",
        hidden: false,
        values: [],
        points: true,
        lines: false,
        dragMode: "NONE",
        pointStyle: "POINT",
        lineStyle: "SOLID",
        colorLatex: "",
        lineOpacity: "",
        lineWidth: "",
        pointOpacity: "",
        pointSize: "",
        id: "46", // no
      },
    ],
    "columns.[]": {
      latex: "x_{3}", // changes each time
      color: "#6042a6",
      hidden: false,
      values: [],
      points: true,
      lines: false,
      dragMode: "NONE",
      pointStyle: "POINT",
      lineStyle: "SOLID",
      colorLatex: "",
      lineOpacity: "",
      lineWidth: "",
      pointOpacity: "",
      pointSize: "",
      id: "45", // no
    },
    "columns.[].hidden": false,
    "columns.[].id": "45", // no
    "columns.[].color": "#6042a6",
    "columns.[].latex": "x_{3}",
    "columns.[].values": [],
    "columns.[].lines": false,
    "columns.[].pointStyle": "POINT",
    "columns.[].lineStyle": "SOLID",
    "columns.[].lineOpacity": "",
    "columns.[].lineWidth": "",
    "columns.[].pointSize": "",
    "columns.[].pointOpacity": "",
    "columns.[].dragMode": "NONE",
    "columns.[].colorLatex": "",
  },
  folder: {
    type: "folder",
    id: "41", // should never be used
    title: "",
    collapsed: false,
    hidden: false,
  },
  text: {
    type: "text",
    id: "32", // should never be used
    text: "",
  },
  image: {
    type: "image",
    id: "39", // should never be used
    image_url: "",
    name: "", // should never be used
    width: "6.6",
    center: "\\left(0,0\\right)",
    angle: "0",
    height: "10",
    opacity: "1",
  },
} as const;
