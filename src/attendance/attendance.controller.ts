import { Body, Controller, Param, Post, Get } from "@nestjs/common";
import { AttendanceService } from "./attendance.service";
import { CreateAttendanceDto } from "./dto/crate-attendance.dto";

@Controller('attendance')
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService ){}

    @Post()
    create(@Body() createAttendanceDto:CreateAttendanceDto){
        return this.attendanceService.createAttendance(createAttendanceDto);
    }


}
 