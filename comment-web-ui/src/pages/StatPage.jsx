import { useStatContext } from "../contexts/StatsProvider";

const StatPage = () => {

    const { stats, updateStats } = useStatContext();

    return <p
        style={{
            whiteSpace: 'pre-wrap',
            fontFamily: 'Consolas, monospace'
        }}
    >
        {JSON.stringify(stats, null, 4)}
    </p>;
}

export default StatPage;