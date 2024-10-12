import {
  Image,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Snippet,
} from '@nextui-org/react';

export default function Component(props) {
    const { T } = props;

    return (
        <div className="setting-row">
            <div className="flex flex-col">
                <div className="setting-row-title">中文交流群</div>
                <div className="setting-row-summary">
                    加入中文用户群，即时交流与互助
                </div>
            </div>
            <div className="flex-auto"></div>
            <div className="setting-row-action">
                <div className="select-none flex flex-row gap-2 items-center">
                    <Popover placement="bottom" showArrow={true}>
                        <PopoverTrigger>
                            <span className=" underline underline-offset-4 cursor-pointer">
                                微信
                            </span>
                        </PopoverTrigger>
                        <PopoverContent>
                            <div className="pl-2 opacity-80">
                                <Image
                                    src="https://releases.filethings.net/contact/wechat-hz.webp"
                                    width={128}
                                    height={128}
                                    radius="md"
                                    // 禁止拖动,下载和右键菜单
                                    draggable="false"
                                    onContextMenu={(e) => e.preventDefault()}
                                />
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Popover placement="bottom" showArrow={true}>
                        <PopoverTrigger>
                            <span className=" underline underline-offset-4 cursor-pointer">
                                QQ群
                            </span>
                        </PopoverTrigger>
                        <PopoverContent>
                            <div className="pl-2 opacity-90">
                                <Image
                                    src="https://releases.filethings.net/contact/qq-group.webp"
                                    width={128}
                                    height={128}
                                    radius="md"
                                    // 禁止拖动,下载和右键菜单
                                    draggable="false"
                                    onContextMenu={(e) => e.preventDefault()}
                                />
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Snippet
                        classNames={{
                            base: "py-0",
                            pre: "py-0",
                            content: "py-0",
                        }}
                        symbol=""
                        size="sm"
                        disableTooltip={true}
                    >
                        622192273
                    </Snippet>
                </div>
            </div>
        </div>
    );
}
