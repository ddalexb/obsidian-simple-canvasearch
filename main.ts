import {
  App,
  FuzzySuggestModal,
  ItemView,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
} from "obsidian";

import { AllCanvasNodeData } from "obsidian/canvas";

interface CanvaSearchSettings {
  searchText: boolean;
}

const DEFAULT_SETTINGS: CanvaSearchSettings = {
  searchText: false,
};

var current_index: [AllCanvasNodeData, string][];

function focusOnNode(canvas: any, node: any) {
  canvas.zoomToBbox({
    minX: node.x - node.width * 1,
    minY: node.y - node.height * 1,
    maxX: node.x + node.width * 1,
    maxY: node.y + node.height * 1,
  });
}

export default class CanvaSearch extends Plugin {
  settings: CanvaSearchSettings;
  async index_canvas_notes(
    searchText: boolean
  ): Promise<[AllCanvasNodeData, string][]> {
    const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
    const vault = this.app.vault;
    if (canvasView?.getViewType() === "canvas") {
      // @ts-ignore
      const canvas = canvasView.canvas;
      let return_array;
      if (searchText) {
        return_array = canvas.data.nodes.map(async function (
          a: AllCanvasNodeData
        ) {
          if (a.type == "file") {
            let content = await vault.cachedRead(
              <TFile>vault.getAbstractFileByPath(a.file)
            );
            return [a, content];
          }
          if (a.type == "text") {
            let content = a.text;
            return [a, content];
          }
          if (a.type == "link") {
            let content = a.url;
            return [a, content];
          }
        });
      } else {
        return_array = canvas.data.nodes.map(async function (
          a: AllCanvasNodeData
        ) {
          return [a, ""];
        });
      }
      return await Promise.all(return_array);
    } else return [];
  }

  async onload() {
    await this.loadSettings();
    this.addCommand({
      id: "open-canvasearch-modal",
      name: "Open CanvaSearch modal",
      callback: async () => {
        current_index = await this.index_canvas_notes(this.settings.searchText);
        console.log(current_index);
        new CanvaSearchModal(this.app).open();
      },
    });

    this.addSettingTab(new CanvaSearchSettingTab(this.app, this));
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class CanvaSearchModal extends FuzzySuggestModal<[AllCanvasNodeData, string]> {
  getActiveCanvas(): any {
    const maybeCanvasView = this.app.workspace.getLeaf().view;
    return maybeCanvasView ? (maybeCanvasView as any)["canvas"] : null;
  }
  constructor(app: App) {
    super(app);
  }

  getItems(): [AllCanvasNodeData, string][] {
    return current_index;
  }
  getItemText(data: [AllCanvasNodeData, string]): string {
    switch (data[0].type) {
      case "file":
        console.log(data);
        // @ts-ignore
        return data[0].file + "\n" + data[1];
      case "text":
        return data[0].text;
      case "link":
        return data[0].url;
      default:
        return "";
    }
  }
  onChooseItem(
    data: [AllCanvasNodeData, string],
    evt: MouseEvent | KeyboardEvent
  ) {
    const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
    const canvas = "";
    if (canvasView?.getViewType() === "canvas") {
      // @ts-ignore
      const canvas = canvasView.canvas;
    }
    let data2 = data[0];
    switch (data2.type) {
      case "file":
        new Notice(`Selected ${data2.file}`);
        focusOnNode(this.getActiveCanvas(), data2);
        break;
      case "text":
        new Notice(`Selected ${data2.text}`);
        focusOnNode(this.getActiveCanvas(), data2);
        break;
      case "link":
        new Notice(`Selected ${data2.url}`);
        break;
    }
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.setText("Woah!");
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class CanvaSearchSettingTab extends PluginSettingTab {
  plugin: CanvaSearch;

  constructor(app: App, plugin: CanvaSearch) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Include note contents in search")
      .setDesc(
        "Will search inside the notes in your canvas, there is no indexing done so it can be very slow if your canvas is very large."
      )
      .addToggle(toggle => {
        toggle.setValue(this.plugin.settings.searchText)
        toggle.onChange(async (value) => {
                  this.plugin.settings.searchText = value;
                  await this.plugin.saveSettings();
        });
      });
  }
}