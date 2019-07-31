const { ConfirmPrompt, TextPrompt, WaterfallDialog, ChoiceFactory, ChoicePrompt, DialogSet } = require('botbuilder-dialogs');
const { AttachmentLayoutTypes, CardFactory, MessageFactory } = require('botbuilder-core');
const { CancelAndHelpDialog } = require('./cancelAndHelpDialog');
const { DialogHelper } = require('./dialogHelper');
const { Aborter, BlockBlobURL, ContainerURL, ServiceURL, SharedKeyCredential, StorageURL, uploadStreamToBlockBlob, uploadFileToBlockBlob} = require('@azure/storage-blob');

const WATERFALL_DIALOG = 'waterfallDialog';

const axios = require('axios');

const ONE_MINUTE = 60 * 1000;
const aborter = Aborter.timeout(30 * ONE_MINUTE);

class AnalyzeDocumentsDialog extends CancelAndHelpDialog {
    constructor(id) {
        super(id || 'analyzeDocumentsDialog');

        this.dialogHelper = new DialogHelper();

        this.state = {
          documentNameSearch: []
        };

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
                this.destinationStep.bind(this)
            ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    /**
     * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} turnContext
     * @param {*} accessor
     */
    async onTurn(turnContext, accessor) {
        // Call QnA Maker and get results.
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        await dialogContext.beginDialog(this.id);

    }

    /**
     * If a destination city has not been provided, prompt for one.
     */
    async destinationStep(stepContext) {

      var self = this;

      await axios.get(process.env.SearchService +'/indexes/'+ process.env.SearchServiceDocIndex + '/docs?',
              { params: {
                'api-version': '2019-05-06',
                'search': '*'
                },
              headers: {
                'api-key': process.env.SearchServiceKey,
                'ContentType': 'application/json'
        }

        }).then(response => {

          if (response){
            var itemArray = []
            self.state.documentNameSearch = []
            var itemCount = response.data.value.length
            itemArray = self.state.documentNameSearch.slice();

            for (var i = 0; i < itemCount; i++)
            {
                  const itemResult = response.data.value[i].metadata_storage_name

                  if (itemArray.indexOf(itemResult) === -1)
                  {
                    itemArray.push({'title': itemResult, 'value': itemResult})
                  }
            }

            //console.log(itemArray)
            self.state.documentNameSearch = itemArray

         }

        }).catch((error)=>{
               console.log(error);
        });

        await stepContext.context.sendActivity({ attachments: [this.dialogHelper.createComboListCard(this.state.documentNameSearch, 'document_name_selector_value')] });

        await stepContext.context.sendActivity({ attachments: [this.dialogHelper.createBotCard('...Is there anything else I can help you with?','')] });

        var reply = MessageFactory.suggestedActions(['How Do I Calculate the 2% Retirement Formula','Select a Report by Report Name', 'Report Search Options', 'Search with LUIS', 'Analyze Documents']);
        await stepContext.context.sendActivity(reply);

        return await stepContext.endDialog('End Dialog');

      // const credentials = new SharedKeyCredential(process.env.StorageAccountName, process.env.StorageAccountKey);
      // const pipeline = StorageURL.newPipeline(credentials);
      // const serviceURL = new ServiceURL('https://'+process.env.StorageAccountName+'.blob.core.windows.net', pipeline);
      // const containerURL = ContainerURL.fromServiceURL(serviceURL, process.env.StorageAccountContainerName);
      //
      //
      // let response;
      // let marker;
      //
      // this.state.documentNameSearch = []
      // var itemArray = this.state.documentNameSearch.slice();
      //
      // do {
      //     response = await containerURL.listBlobFlatSegment(aborter);
      //     marker = response.marker;
      //     for(let blob of response.segment.blobItems) {
      //         //console.log(` - ${ blob.name }`);
      //         itemArray.push({'title': blob.name, 'value': blob.name})
      //     }
      // } while (marker);
      //
      // this.state.documentNameSearch = itemArray
      //
      // if(this.state.documentNameSearch != null){
      //
      //   await stepContext.context.sendActivity({ attachments: [this.dialogHelper.createComboListCard(this.state.documentNameSearch, 'document_name_selector_value')] });
      //
      //   await stepContext.context.sendActivity({ attachments: [this.dialogHelper.createBotCard('...Is there anything else I can help you with?','')] });
      //
      //   var reply = MessageFactory.suggestedActions(['How Do I Calculate the 2% Retirement Formula','Select a Report by Report Name', 'Report Search Options', 'Search with LUIS', 'Analyze Documents']);
      //   await stepContext.context.sendActivity(reply);
      //
      //   return await stepContext.endDialog('End Dialog');
      //
      // }else{
      //
      //   itemArray.push({'title': 'blob.name', 'value': 'blob.name'})
      //   this.state.documentNameSearch = itemArray
      //   await stepContext.context.sendActivity({ attachments: [this.dialogHelper.createComboListCard(this.state.documentNameSearch, 'document_name_selector_value')] });
      //
      //   await stepContext.context.sendActivity({ attachments: [this.dialogHelper.createBotCard('...Is there anything else I can help you with?','')] });
      //
      //   var reply = MessageFactory.suggestedActions(['How Do I Calculate the 2% Retirement Formula','Select a Report by Report Name', 'Report Search Options', 'Search with LUIS', 'Analyze Documents']);
      //   await stepContext.context.sendActivity(reply);
      //
      //   return await stepContext.endDialog('End Dialog');
      //
      // }

    }

}

module.exports.AnalyzeDocumentsDialog = AnalyzeDocumentsDialog;
