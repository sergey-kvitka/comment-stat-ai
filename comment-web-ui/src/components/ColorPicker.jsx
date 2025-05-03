import React, { useState, useCallback } from 'react';
import { Popover, Button, Box, Stack } from '@mui/material';
import { ChromePicker } from 'react-color';

const ColorPicker = ({ initialColor = '#ffffff', onChange }) => {

    const [anchorEl, setAnchorEl] = useState(null);
    const [color, setColor] = useState(initialColor);
    const [tempColor, setTempColor] = useState(initialColor);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
        setTempColor(color); // Сбрасываем временный цвет при открытии
    };

    const handleClose = useCallback(() => {
        setAnchorEl(null);
    }, []);

    const handleApply = useCallback(() => {
        setColor(tempColor);
        if (onChange) onChange(tempColor);
        handleClose();
    }, [tempColor, onChange, handleClose]);

    const handleChange = useCallback((newColor) => {
        setTempColor(newColor.hex);
    }, []);

    const open = Boolean(anchorEl);

    return <Box>
        <Button
            variant="contained"
            onClick={handleClick}
            sx={{
                backgroundColor: color,
                '&:hover': {
                    backgroundColor: color,
                    opacity: 0.9
                },
                width: 100,
                height: 40,
                color: getContrastColor(color)
            }}
        >
            {color}
        </Button>

        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={handleClose}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
            }}
            sx={{
                '& .MuiPopover-paper': {
                    borderRadius: 2,
                    overflow: 'visible'
                }
            }}
        >
            <Box sx={{ p: 1 }}>
                <ChromePicker
                    color={tempColor}
                    onChange={handleChange}
                    styles={{
                        default: {
                            swatch: {
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                transform: 'translate(-8px, -8px)'
                            },
                            picker: {
                                boxShadow: 'none',
                                borderRadius: '8px 8px 0 0'
                            }
                        }
                    }}
                />
                <Stack direction="row" spacing={1} sx={{ p: 1, justifyContent: 'space-evenly' }}>
                    <Button
                        color='error'
                        onClick={handleClose}
                        sx={{ textTransform: 'none' }}
                    >
                        Отмена
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleApply}
                        sx={{
                            textTransform: 'none',
                            '&:hover': {
                                opacity: 0.9
                            }
                        }}
                    >
                        Применить
                    </Button>
                </Stack>
            </Box>
        </Popover>
    </Box>;
};

// Вспомогательная функция для контрастного текста
function getContrastColor(hexColor) {
    if (!hexColor) return '#000';
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 160 ? '#000000' : '#FFFFFF';
}

export default React.memo(ColorPicker);