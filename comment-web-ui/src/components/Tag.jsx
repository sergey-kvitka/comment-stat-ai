import { Chip } from "@mui/material";
import { useMemo } from "react";

const Tag = ({ text, color, title, onClick = null, styles = {} }) => {

    const textColor = useMemo(() => {
        if (!color || !/^#[0-9A-F]{6}$/i.test(color)) return 'white';
        const [r, g, b] = [
            parseInt(color.substring(1, 3), 16),
            parseInt(color.substring(3, 5), 16),
            parseInt(color.substring(5, 7), 16),
        ];
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 160 ? 'black' : 'white';
    }, [color]);

    return <Chip
        size="small"
        label={text}
        color={color}
        title={title}
        onClick={onClick}
        sx={{
            bgcolor: color,
            color: textColor,
            flexShrink: 0,
            '& .MuiChip-label': { whiteSpace: 'nowrap', px: 1 },
            ...styles
        }}
    />;
}

export default Tag;