To simulate input changes on a Material-UI (MUI) TextField with type="number" using Jest and React Testing Library, you should use the @testing-library/user-event library's type method or fireEvent.change on the underlying input element.
The key is to first access the actual DOM input element within the MUI component and then trigger the event.
Using @testing-library/user-event
Using user-event is the recommended approach as it simulates natural user interactions more closely (typing, pasting, clearing, etc.).

```
npm install @testing-library/user-event --save-dev
jsx
import { TextField } from '@mui/material';
import { useState } from 'react';

const NumberInputComponent = () => {
  const [value, setValue] = useState(0);

  const handleChange = (event) => {
    setValue(Number(event.target.value));
  };

  return (
    <TextField
      label="Quantity"
      type="number"
      value={value}
      onChange={handleChange}
      inputProps={{
        "data-testid": "number-input",
      }}
    />
  );
};
export default NumberInputComponent;
Use code with caution.
```

Note: The inputProps prop is used to add a data-testid to the actual <input> element for easy selection.

jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NumberInputComponent from './NumberInputComponent';

test('simulates number input change with user-event', async () => {
render(<NumberInputComponent />);
const input = screen.getByTestId('number-input');

// The userEvent.type function simulates the user typing each character
await userEvent.type(input, '123');

// Assert the value in the document
expect(input).toHaveValue(123); // Input values are numbers when type="number"
});

screen.getByTestId('number-input') retrieves the underlying <input> element.
userEvent.type(input, '123') simulates the typing process. Since it's a number input, the value is cast to a number.
Using fireEvent.change
If you need a simpler, direct way to trigger the change event, you can use fireEvent.change. Note that this only triggers the change event and does not simulate a full user interaction (e.g., it doesn't fire individual key presses).
jsx
import { render, screen, fireEvent } from '@testing-library/react';
import NumberInputComponent from './NumberInputComponent';

test('simulates number input change with fireEvent', () => {
render(<NumberInputComponent />);
const input = screen.getByTestId('number-input');

// fireEvent.change requires the new value in the event payload
fireEvent.change(input, { target: { value: '456' } });

expect(input).toHaveValue(456);
});
Use code with caution.

fireEvent.change(input, { target: { value: '456' } }) dispatches a change event with the specified new value.
