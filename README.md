# prizmdoc-form-burner-example

PrizmDoc form definition files are created using the PrizmDoc template designer.
PrizmDoc Application Services stores the files in a FormDefinitions folder on
your server. The files are typically loaded into the PrizmDoc e-signer to be filled
out and burned into a PDF.

This example service demonstrates converting form definition fields to markup and
burning them to PDF. This allows you to produce a filled out form server-side
(without having to load the form into the e-signer). Note that this example does not
convert Signature/Initial, Checkbox, or Date fields, only Text fields are converted.

## Dev Environment

- Required
  - Node.js v10.15.x
  - PrizmDoc Server v13.9

### Cloud

If you prefer to connect to PrizmDoc Cloud instead of installing PrizmDoc Server, you
will need to update the code at the top of main.js to set the host to "https://api.accusoft.com"
instead of "http://localhost:18681". You will also need to set the "apiKey" variable to
your PrizmDoc Cloud API key.

### Self Hosted

The default configuration assumes that formBurner is running on the machine which is also running
PrizmDoc Server. If formBurner is not on the machine with PrizmDoc Server installed the value of
host will need to be set to the address of the machine with PrizmDoc Server running.

This example requires PrizmDoc Server v13.9 (or greater), which addressed an issue in the Markup Burner
API where a required font from the PrizmDoc Viewer installation (that is used by the text markup being
burned) could not be found. This font initialization issue was specific to a case where the text markup
(with that font) was burning for the first time after the PrizmDoc services initialization and resulted
in the Markup Burner API failure.

To obtain the v13.9 beta version of PrizmDoc Server, contact support@accusoft.com.

## Running the Service

1. Clone this repository, open a command line, and change to the form-burner directory.
2. Run `npm install`.
3. Run `node main.js`.
4. Make a GET request to http://localhost:3001/formBurner/04a6032f3eaa4a8a9eb1b5fce1cb99e9
to get a burned PDF of the form.

This loads the /FormDefinitions/04a6032f3eaa4a8a9eb1b5fce1cb99e9.json form definition file and
the field values defined in the /FormDefinitions/04a6032f3eaa4a8a9eb1b5fce1cb99e9.data.json file.
Markup JSON is created using the form definition field data and the field values.

The PrizmDoc Server Markup Burner API is used to burn that markup into the form document
(located in the Documents folder, and referenced by the "templateDocumentId" in the form
definition file).

The formBurner request will work with the ID of any form definition file in the FormDefinitions
folder, if the corresponding form document is in the Documents folder. If values to fill each
field are also provided in a corresponding data.json file, then those values will be used to fill
the form. Otherwise, the value of "example" will be used.
