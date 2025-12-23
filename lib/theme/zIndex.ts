import { ZIndexOptions } from '@mui/material/styles'

/**
 * The custom theme zIndex.
 *
 * @see https://mui.com/material-ui/customization/z-index/
 */
export const zIndex: ZIndexOptions = {
  appBar: 1200,
  drawer: 1100,
  modal: 1300,
  snackbar: 1400,
  tooltip: 1500,
  loadingIndicator: 9999, // Added for loading indicator
}
