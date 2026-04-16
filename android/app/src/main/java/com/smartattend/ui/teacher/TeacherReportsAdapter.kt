package com.smartattend.ui.teacher

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.smartattend.R
import com.smartattend.domain.model.AttendanceReportRow

class TeacherReportsAdapter : ListAdapter<AttendanceReportRow, TeacherReportsAdapter.VH>(DIFF) {

    class VH(view: View) : RecyclerView.ViewHolder(view) {
        val tvName: TextView = view.findViewById(R.id.tvStudentName)
        val tvCode: TextView = view.findViewById(R.id.tvStudentCode)
        val tvPresent: TextView = view.findViewById(R.id.tvPresent)
        val tvAbsent: TextView = view.findViewById(R.id.tvAbsent)
        val tvPercentage: TextView = view.findViewById(R.id.tvPercentage)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_teacher_report, parent, false))

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = getItem(position)
        holder.tvName.text = item.name
        holder.tvCode.text = item.studentCode ?: item.rollNumber ?: "—"
        holder.tvPresent.text = "${item.presentCount}/${item.totalClasses}"
        holder.tvAbsent.text = item.absentCount.toString()

        val pct = item.percentage
        holder.tvPercentage.text = "${String.format("%.1f", pct)}%"
        val color = when {
            pct >= 75 -> "#16A34A"
            pct >= 60 -> "#D97706"
            else -> "#DC2626"
        }
        holder.tvPercentage.setTextColor(Color.parseColor(color))
    }

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<AttendanceReportRow>() {
            override fun areItemsTheSame(a: AttendanceReportRow, b: AttendanceReportRow) =
                a.studentId == b.studentId
            override fun areContentsTheSame(a: AttendanceReportRow, b: AttendanceReportRow) = a == b
        }
    }
}
