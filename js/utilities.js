ngAPI.parse = {
    /**
    * Returns a string a history entrys status
    * @param hist   history item object
    */
    historyStatus: function(hist) {
        if(hist.Status) {
            return hist.Status
            .toLowerCase()
            .split('/');
        }

        // < v13 compat
        if (hist.Kind === 'NZB') {
            switch(true) {
                case hist.ParStatus == 'FAILURE':
                case hist.UnpackStatus == 'FAILURE':
                case hist.MoveStatus == 'FAILURE':
                case hist.ScriptStatus == 'FAILURE':
                    return ['failure'];
                case hist.ParStatus == 'MANUAL':
                    return ['damaged'];
                case hist.ScriptStatus == 'UNKNOWN':
                    return ['unknown'];
                case hist.ScriptStatus == 'SUCCESS':
                case hist.UnpackStatus == 'SUCCESS':
                case hist.ParStatus == 'SUCCESS':
                    return ['success'];
                case hist.ParStatus == 'REPAIR_POSSIBLE':
                    return ['repairable'];
                case hist.ParStatus == 'NONE':
                    return ['unknown'];
            }
        } else if (hist.Kind === 'URL') {
            switch (hist.UrlStatus) {
                case 'SUCCESS': return ['success'];
                case 'FAILURE': return ['failure'];
                case 'UNKNOWN': return ['unknown'];
            }
        }
    }
};
