const express = require('express');
const axios = require('axios');
const app = express();
const fs = require('fs');

// PrizmDoc Server must be installed to use this.
const host = 'http://localhost:18681';

// Use the following instead to use PrizmDoc Cloud.
// const host = 'https://api.accusoft.com';
const apiKey = 'YOUR_API_KEY';

const postMarkup = async marks => {
  const response = await axios({
    url: `${host}/PCCIS/V1/WorkFile?FileExtension=json`,
    data: {
      marks
    },
    method: 'POST',
    headers: {
      'Content-Type': 'octet-stream',
      'acs-api-key': apiKey
    }
  });

  return { markupFileId: response.data.fileId, affinityToken: response.data.affinityToken };
};

const postDocument = async (documentName, affinityToken) => {
  const response = await axios({
    url: `${host}/PCCIS/V1/WorkFile`,
    data: fs.readFileSync(__dirname + '/Documents/' + documentName),
    method: 'POST',
    headers: {
      'Content-Type': 'octet-stream',
      'acs-api-key': apiKey,
      'Accusoft-Affinity-Token': affinityToken || ''
    }
  });

  return response.data.fileId;
};

const postBurner = async (documentFileId, markupFileId, affinityToken) => {
  const response = await axios({
    url: `${host}/PCCIS/V1/MarkupBurner`,
    data: {
      'input': {
        'documentFileId': documentFileId,
        'markupFileId': markupFileId
      }
    },
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'acs-api-key': apiKey,
      'Accusoft-Affinity-Token': affinityToken || ''
    }
  });

  return response.data.processId;
};

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const getBurner = async (processId, affinityToken) => {
  const response = await axios({
    url: `${host}/PCCIS/V1/MarkupBurner/${processId}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'acs-api-key': apiKey,
      'Accusoft-Affinity-Token': affinityToken || ''
    }
  });

  console.log(`MarkupBurner percentComplete: ${response.data.percentComplete}`);

  if (response.data.state === 'complete') {
    return response.data.output.documentFileId;
  }

  if (response.data.state === 'error') {
    return;
  }

  await sleep(1000);
  return getBurner(processId, affinityToken);
};

const getBurnedDocument = async (documentFileId, documentName, affinityToken) => {
  const response = await axios({
    url: `${host}/PCCIS/V1/WorkFile/${documentFileId}`,
    method: 'GET',
    responseType: 'arraybuffer',
    headers: {
      'Content-Type': 'application/pdf',
      'acs-api-key': apiKey,
      'Accusoft-Affinity-Token': affinityToken || ''
    }
  });

  // Uncomment the line below to save the burned document to disk.
  // fs.writeFileSync(`${__dirname}/${documentName}_burned.pdf`, response.data);

  return response.data;
};

const convertForm = (fieldValues, formDefinitionId, res) => {
  fs.readFile(`${__dirname}/FormDefinitions/${formDefinitionId}.json`, 'utf8', function (err, data) {
    const formDefinition = JSON.parse(data);
    let marks = [];

    const globalFontName = (formDefinition.globalSettings && formDefinition.globalSettings.fontName) || 'Fira Sans';
    const globalFontColor = (formDefinition.globalSettings && formDefinition.globalSettings.fontColor) || '#000000';

    formDefinition.formData.forEach(field => {
      if (field.template === 'TextTemplate') {
        let mark = {};
        if (field.multiline) {
          mark.type = 'TextAreaSignature';
          mark.maxFontSize = field.fontSize || 8;
          mark.fontStyle = [];
        } else {
          mark.type = 'TextInputSignature';
        }
        mark.uid = field.fieldId;
        mark.interactionMode = 'Full';
        mark.creationDateTime = '2019-06-25T19:28:13.396Z';
        mark.modificationDateTime = '2019-06-25T19:28:13.396Z';
        mark.mask = null;
        mark.maxLength = 0;
        mark.rectangle = { x: field.rectangle.x, y: field.rectangle.y, width: field.rectangle.width, height: field.rectangle.height };
        mark.pageData = { width: field.pageData.width, height: field.pageData.height };
        mark.pageNumber = field.pageNumber;
        mark.fontColor = (field.fontColor === 'UseGlobalFontColorSetting') ? globalFontColor : field.fontColor;
        mark.fontName = (field.fontName === 'UseGlobalFontNameSetting') ? globalFontName : field.fontName;
        mark.horizontalAlignment = field.horizontalAlignment ? (field.horizontalAlignment.charAt(0).toUpperCase() + field.horizontalAlignment.slice(1)) : 'Left';
        // If a field value is not provided, this example uses the value of "example".
        mark.text = (fieldValues[field.fieldId] !== undefined) ? fieldValues[field.fieldId] : 'example';
        marks.push(mark);
      }
    });

    burnForm(marks, formDefinition.templateDocumentId, res);
  });
};

const burnForm = async (marks, documentName, res) => {
  const { affinityToken, markupFileId } = await postMarkup(marks);
  console.log(`markupFileId: ${markupFileId}`);
  const documentFileId = await postDocument(documentName, affinityToken);
  console.log(`documentFileId: ${documentFileId}`);
  const processId = await postBurner(documentFileId, markupFileId, affinityToken);
  console.log(`processId: ${processId}`);
  const burnedDocumentFileId = await getBurner(processId, affinityToken);
  console.log(`burnedDocumentFileId: ${burnedDocumentFileId}`);
  const burnedDocument = await getBurnedDocument(burnedDocumentFileId, documentName, affinityToken);
  res.end(burnedDocument, 'binary');
};

app.get('/formBurner/:id', function (req, res) {
  // This example uses the field value provided in the data.json file in the FormDefinitions folder.
  // You can update the code to instead load the data from elsewhere, such as a database.
  fs.readFile(`${__dirname}/FormDefinitions/${req.params.id}.data.json`, 'utf8', function (err, data) {
    const fieldValues = !err ? JSON.parse(data) : {};
    convertForm(fieldValues, req.params.id, res);
  });
});

var server = app.listen(3001, () => console.log('listening on port 3001'));
